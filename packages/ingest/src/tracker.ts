import { StateVector, FlightTrack, BoundingBox } from "@skylens/core";
import { fetchStateVectors, OpenSkyOptions } from "./opensky";
import { assembleFlightTracks } from "./parser";

export interface TrackerOptions {
  bbox?: BoundingBox;
  intervalMs?: number;
  openSky?: OpenSkyOptions;
  onUpdate?: (tracks: FlightTrack[]) => void;
}

/** Real-time flight tracker that polls OpenSky at regular intervals */
export class FlightTracker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private history = new Map<string, StateVector[]>();
  private options: TrackerOptions;

  constructor(options: TrackerOptions = {}) {
    this.options = { intervalMs: 10000, ...options };
  }

  start(): void {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), this.options.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getTracks(): FlightTrack[] {
    return assembleFlightTracks(
      Array.from(this.history.values()).flat(),
    );
  }

  private async poll(): Promise<void> {
    try {
      const states = await fetchStateVectors(this.options.bbox, this.options.openSky);
      for (const s of states) {
        const list = this.history.get(s.icao24) ?? [];
        list.push(s);
        if (list.length > 1000) list.shift();
        this.history.set(s.icao24, list);
      }
      this.options.onUpdate?.(this.getTracks());
    } catch {
      // Silently retry on next interval
    }
  }
}
