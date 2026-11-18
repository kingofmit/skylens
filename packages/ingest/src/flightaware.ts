import { StateVector } from "@skylens-aviation/core";

export interface FlightAwareOptions {
  apiKey: string;
}

/** Parse a single FlightAware Firehose JSON line into a StateVector (or null if not a position msg) */
export function parseFirehoseMessage(line: string): StateVector | null {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(line);
  } catch {
    return null;
  }

  if (msg.type !== "position" && msg.type !== "flightplan") return null;

  const lat = msg.lat as number | undefined;
  const lon = msg.lon as number | undefined;
  if (lat == null || lon == null) return null;

  return {
    icao24: ((msg.hexid as string) ?? (msg.id as string) ?? "").toLowerCase(),
    callsign: (msg.ident as string)?.trim() ?? null,
    timestamp: (msg.pitr as number) ?? (msg.clock as number) ?? Date.now() / 1000,
    latitude: lat,
    longitude: lon,
    altitudeFt: (msg.alt as number) ?? 0,
    groundSpeedKts: (msg.gs as number) ?? 0,
    trackDeg: (msg.heading as number) ?? 0,
    verticalRateFpm: 0,
    onGround: (msg.airground as string) === "G",
  };
}

/** Streaming parser for FlightAware Firehose newline-delimited JSON */
export class FirehoseStream {
  private buffer = "";
  private _onState: ((sv: StateVector) => void) | null = null;

  onState(callback: (sv: StateVector) => void): void {
    this._onState = callback;
  }

  /** Feed raw data chunk into the stream parser */
  push(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const sv = parseFirehoseMessage(line);
      if (sv) this._onState?.(sv);
    }
  }

  /** Flush remaining buffer */
  flush(): void {
    if (this.buffer.trim()) {
      const sv = parseFirehoseMessage(this.buffer);
      if (sv) this._onState?.(sv);
    }
    this.buffer = "";
  }
}
