import { StateVector } from "@skylens/core";

/** Raw decoded Mode S frame */
export interface BeastFrame {
  dfType: number;
  icao24: string;
  payload: Uint8Array;
  timestamp: number;
}

/** CRC-24 lookup table for Mode S */
const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i << 16;
    for (let j = 0; j < 8; j++) {
      crc <<= 1;
      if (crc & 0x1000000) crc ^= 0x1fff409;
    }
    table[i] = crc & 0xffffff;
  }
  return table;
}

function crc24(data: Uint8Array, len: number): number {
  let crc = 0;
  for (let i = 0; i < len; i++) {
    crc = ((crc << 8) ^ CRC_TABLE[((crc >> 16) ^ data[i]) & 0xff]) & 0xffffff;
  }
  return crc;
}

/** Parse a single Beast binary frame (escaped format: 0x1a prefix) */
export function parseBeastFrame(buffer: Uint8Array): BeastFrame | null {
  if (buffer.length < 9) return null;
  if (buffer[0] !== 0x1a) return null;

  const msgType = buffer[1];
  let payloadLen: number;
  if (msgType === 0x31) payloadLen = 2;       // Mode A/C
  else if (msgType === 0x32) payloadLen = 7;  // Mode S short
  else if (msgType === 0x33) payloadLen = 14; // Mode S long (ADS-B)
  else return null;

  const headerLen = 2 + 6; // 0x1a + type + 6-byte MLAT timestamp
  if (buffer.length < headerLen + payloadLen) return null;

  // 6-byte MLAT timestamp (12MHz clock)
  let ts = 0;
  for (let i = 2; i < 8; i++) {
    ts = ts * 256 + buffer[i];
  }
  const timestamp = ts / 12e6;

  const payload = buffer.slice(headerLen, headerLen + payloadLen);
  const dfType = (payload[0] >> 3) & 0x1f;

  // Extract ICAO from DF17/18 (ADS-B)
  let icao24 = "";
  if ((dfType === 17 || dfType === 18) && payloadLen === 14) {
    icao24 = (
      ((payload[1] << 16) | (payload[2] << 8) | payload[3]) >>> 0
    ).toString(16).padStart(6, "0");
  } else if (dfType === 11 && payloadLen >= 7) {
    // DF11 — All-Call Reply
    icao24 = (
      ((payload[1] << 16) | (payload[2] << 8) | payload[3]) >>> 0
    ).toString(16).padStart(6, "0");
  } else {
    return null;
  }

  return { dfType, icao24, payload, timestamp };
}

/** Decode an ADS-B (DF17/18) frame into partial state vector fields */
export function decodeModeS(frame: BeastFrame): Partial<StateVector> | null {
  if (frame.dfType !== 17 && frame.dfType !== 18) return null;

  // CRC check: last 3 bytes should yield 0 when included
  const crc = crc24(frame.payload, frame.payload.length - 3);
  const msgCrc = (frame.payload[frame.payload.length - 3] << 16) |
    (frame.payload[frame.payload.length - 2] << 8) |
    frame.payload[frame.payload.length - 1];
  if ((crc ^ msgCrc) !== 0) return null;

  const typeCode = (frame.payload[4] >> 3) & 0x1f;
  const result: Partial<StateVector> = { icao24: frame.icao24, timestamp: frame.timestamp };

  // Airborne position (TC 9-18)
  if (typeCode >= 9 && typeCode <= 18) {
    const cprLat = ((frame.payload[6] & 0x03) << 15) | (frame.payload[7] << 7) | (frame.payload[8] >> 1);
    const cprLon = ((frame.payload[8] & 0x01) << 16) | (frame.payload[9] << 8) | frame.payload[10];
    result.latitude = (cprLat / 131072) * 360 - 90;
    result.longitude = (cprLon / 131072) * 360 - 180;

    // Altitude
    const altCode = ((frame.payload[5] << 4) | (frame.payload[6] >> 4)) & 0xfff;
    const qBit = (altCode >> 4) & 1;
    if (qBit) {
      const n = ((altCode & 0xf) | ((altCode >> 1) & 0x7f0));
      result.altitudeFt = n * 25 - 1000;
    }
    result.onGround = false;
  }

  // Surface position (TC 5-8)
  if (typeCode >= 5 && typeCode <= 8) {
    result.onGround = true;
    const movement = ((frame.payload[4] & 0x07) << 4) | (frame.payload[5] >> 4);
    if (movement > 0 && movement < 124) {
      result.groundSpeedKts = decodeGroundMovement(movement);
    }
  }

  // Airborne velocity (TC 19)
  if (typeCode === 19) {
    const subType = frame.payload[4] & 0x07;
    if (subType === 1 || subType === 2) {
      const ewDir = (frame.payload[5] >> 2) & 1;
      const ewVel = ((frame.payload[5] & 0x03) << 8) | frame.payload[6];
      const nsDir = (frame.payload[7] >> 7) & 1;
      const nsVel = ((frame.payload[7] & 0x7f) << 3) | (frame.payload[8] >> 5);
      const vew = ewDir ? -(ewVel - 1) : ewVel - 1;
      const vns = nsDir ? -(nsVel - 1) : nsVel - 1;
      result.groundSpeedKts = Math.sqrt(vew * vew + vns * vns);
      result.trackDeg = ((Math.atan2(vew, vns) * 180) / Math.PI + 360) % 360;

      const vrSign = (frame.payload[8] >> 3) & 1;
      const vrVal = ((frame.payload[8] & 0x07) << 6) | (frame.payload[9] >> 2);
      if (vrVal > 0) {
        result.verticalRateFpm = (vrSign ? -(vrVal - 1) : vrVal - 1) * 64;
      }
    }
  }

  return result;
}

function decodeGroundMovement(code: number): number {
  if (code <= 8) return code * 0.125;
  if (code <= 12) return 1 + (code - 9) * 0.25;
  if (code <= 38) return 2 + (code - 13) * 0.5;
  if (code <= 93) return 15 + (code - 39);
  if (code <= 108) return 70 + (code - 94) * 2;
  return 100 + (code - 109) * 5;
}

/** Stateful Beast decoder that accumulates partial states into full StateVectors */
export class BeastDecoder {
  private aircraft = new Map<string, Partial<StateVector>>();

  /** Process a raw Beast binary chunk, returning any complete StateVectors */
  decode(buffer: Uint8Array): StateVector[] {
    const results: StateVector[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      // Find next 0x1a marker
      while (offset < buffer.length && buffer[offset] !== 0x1a) offset++;
      if (offset >= buffer.length) break;

      const frame = parseBeastFrame(buffer.subarray(offset));
      if (!frame) {
        offset++;
        continue;
      }

      const partial = decodeModeS(frame);
      if (partial && partial.icao24) {
        const existing = this.aircraft.get(partial.icao24) ?? { icao24: partial.icao24 };
        const merged = { ...existing, ...partial };
        this.aircraft.set(partial.icao24, merged);

        if (
          merged.latitude != null &&
          merged.longitude != null &&
          merged.timestamp != null
        ) {
          results.push({
            icao24: merged.icao24!,
            callsign: merged.callsign ?? null,
            timestamp: merged.timestamp,
            latitude: merged.latitude,
            longitude: merged.longitude,
            altitudeFt: merged.altitudeFt ?? 0,
            groundSpeedKts: merged.groundSpeedKts ?? 0,
            trackDeg: merged.trackDeg ?? 0,
            verticalRateFpm: merged.verticalRateFpm ?? 0,
            onGround: merged.onGround ?? false,
          });
        }
      }

      // Advance past this frame
      const msgType = buffer[offset + 1];
      const payloadLen = msgType === 0x33 ? 14 : msgType === 0x32 ? 7 : 2;
      offset += 8 + payloadLen;
    }

    return results;
  }

  clear(): void {
    this.aircraft.clear();
  }
}
