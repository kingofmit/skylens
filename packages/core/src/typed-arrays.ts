import { StateVector } from "./types";

/** Columnar typed-array storage for StateVector arrays (memory-efficient, transferable) */
export class StateVectorBuffer {
  readonly count: number;
  readonly timestamps: Uint32Array;
  readonly latitudes: Float64Array;
  readonly longitudes: Float64Array;
  readonly altitudesFt: Float64Array;
  readonly groundSpeedsKts: Float64Array;
  readonly trackDegs: Float64Array;
  readonly verticalRatesFpm: Float64Array;
  readonly onGroundFlags: Uint8Array;
  readonly icao24s: string[];
  readonly callsigns: (string | null)[];

  private constructor(
    count: number,
    timestamps: Uint32Array,
    latitudes: Float64Array,
    longitudes: Float64Array,
    altitudesFt: Float64Array,
    groundSpeedsKts: Float64Array,
    trackDegs: Float64Array,
    verticalRatesFpm: Float64Array,
    onGroundFlags: Uint8Array,
    icao24s: string[],
    callsigns: (string | null)[],
  ) {
    this.count = count;
    this.timestamps = timestamps;
    this.latitudes = latitudes;
    this.longitudes = longitudes;
    this.altitudesFt = altitudesFt;
    this.groundSpeedsKts = groundSpeedsKts;
    this.trackDegs = trackDegs;
    this.verticalRatesFpm = verticalRatesFpm;
    this.onGroundFlags = onGroundFlags;
    this.icao24s = icao24s;
    this.callsigns = callsigns;
  }

  /** Create a buffer from an array of StateVectors */
  static fromStateVectors(states: StateVector[]): StateVectorBuffer {
    const n = states.length;
    const timestamps = new Uint32Array(n);
    const latitudes = new Float64Array(n);
    const longitudes = new Float64Array(n);
    const altitudesFt = new Float64Array(n);
    const groundSpeedsKts = new Float64Array(n);
    const trackDegs = new Float64Array(n);
    const verticalRatesFpm = new Float64Array(n);
    const onGroundFlags = new Uint8Array(n);
    const icao24s: string[] = [];
    const callsigns: (string | null)[] = [];

    for (let i = 0; i < n; i++) {
      const s = states[i];
      timestamps[i] = s.timestamp;
      latitudes[i] = s.latitude;
      longitudes[i] = s.longitude;
      altitudesFt[i] = s.altitudeFt;
      groundSpeedsKts[i] = s.groundSpeedKts;
      trackDegs[i] = s.trackDeg;
      verticalRatesFpm[i] = s.verticalRateFpm;
      onGroundFlags[i] = s.onGround ? 1 : 0;
      icao24s.push(s.icao24);
      callsigns.push(s.callsign);
    }

    return new StateVectorBuffer(
      n, timestamps, latitudes, longitudes, altitudesFt,
      groundSpeedsKts, trackDegs, verticalRatesFpm, onGroundFlags,
      icao24s, callsigns,
    );
  }

  /** Convert back to StateVector array */
  toStateVectors(): StateVector[] {
    const result: StateVector[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push({
        icao24: this.icao24s[i],
        callsign: this.callsigns[i],
        timestamp: this.timestamps[i],
        latitude: this.latitudes[i],
        longitude: this.longitudes[i],
        altitudeFt: this.altitudesFt[i],
        groundSpeedKts: this.groundSpeedsKts[i],
        trackDeg: this.trackDegs[i],
        verticalRateFpm: this.verticalRatesFpm[i],
        onGround: this.onGroundFlags[i] === 1,
      });
    }
    return result;
  }

  /** Get a slice of the buffer */
  slice(start: number, end: number): StateVectorBuffer {
    return new StateVectorBuffer(
      end - start,
      this.timestamps.slice(start, end),
      this.latitudes.slice(start, end),
      this.longitudes.slice(start, end),
      this.altitudesFt.slice(start, end),
      this.groundSpeedsKts.slice(start, end),
      this.trackDegs.slice(start, end),
      this.verticalRatesFpm.slice(start, end),
      this.onGroundFlags.slice(start, end),
      this.icao24s.slice(start, end),
      this.callsigns.slice(start, end),
    );
  }

  /** Get transferable ArrayBuffers for postMessage */
  transferable(): ArrayBufferLike[] {
    return [
      this.timestamps.buffer,
      this.latitudes.buffer,
      this.longitudes.buffer,
      this.altitudesFt.buffer,
      this.groundSpeedsKts.buffer,
      this.trackDegs.buffer,
      this.verticalRatesFpm.buffer,
      this.onGroundFlags.buffer,
    ];
  }
}

/** Process large datasets in chunks to avoid blocking the main thread */
export class StreamingProcessor {
  private chunkSize: number;

  constructor(chunkSize: number = 10000) {
    this.chunkSize = chunkSize;
  }

  /** Process items in chunks, yielding to the event loop between chunks */
  async process<T>(
    items: T[],
    fn: (chunk: T[]) => void,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += this.chunkSize) {
      const chunk = items.slice(i, i + this.chunkSize);
      fn(chunk);
      // Yield to event loop
      if (i + this.chunkSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
}
