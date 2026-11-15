import { FlightTrack, StateVector, interpolateState, TimeRange } from "@skylens/core";
import { ReplayClock } from "./clock";

export interface ReplayFrame {
  time: number;
  aircraft: Map<string, StateVector>;
}

/** Multi-track replay engine */
export class ReplayEngine {
  private tracks: FlightTrack[] = [];
  private clock: ReplayClock;
  private frameListeners: Array<(frame: ReplayFrame) => void> = [];

  constructor() {
    this.clock = new ReplayClock();
    this.clock.onTick((time) => this.emitFrame(time));
  }

  loadTracks(tracks: FlightTrack[]): void {
    this.tracks = tracks;
    const range = this.getTimeRange();
    if (range) this.clock.configure(range.start, range.end);
  }

  getTimeRange(): TimeRange | null {
    if (this.tracks.length === 0) return null;
    let start = Infinity, end = -Infinity;
    for (const t of this.tracks) {
      for (const s of t.states) {
        if (s.timestamp < start) start = s.timestamp;
        if (s.timestamp > end) end = s.timestamp;
      }
    }
    return { start, end };
  }

  getClock(): ReplayClock { return this.clock; }

  onFrame(listener: (frame: ReplayFrame) => void): () => void {
    this.frameListeners.push(listener);
    return () => { this.frameListeners = this.frameListeners.filter((l) => l !== listener); };
  }

  play(): void { this.clock.play(); }
  pause(): void { this.clock.pause(); }
  stop(): void { this.clock.stop(); }
  seek(time: number): void { this.clock.seek(time); }
  setSpeed(speed: number): void { this.clock.setSpeed(speed); }

  private emitFrame(time: number): void {
    const aircraft = new Map<string, StateVector>();
    for (const track of this.tracks) {
      const state = this.getStateAtTime(track.states, time);
      if (state) aircraft.set(track.icao24, state);
    }
    const frame: ReplayFrame = { time, aircraft };
    for (const l of this.frameListeners) l(frame);
  }

  private getStateAtTime(states: StateVector[], time: number): StateVector | null {
    if (states.length === 0) return null;
    if (time < states[0].timestamp || time > states[states.length - 1].timestamp) return null;
    for (let i = 0; i < states.length - 1; i++) {
      if (time >= states[i].timestamp && time <= states[i + 1].timestamp) {
        return interpolateState(states[i], states[i + 1], time);
      }
    }
    return states[states.length - 1];
  }
}
