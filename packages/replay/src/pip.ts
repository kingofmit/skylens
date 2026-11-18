import { StateVector, CameraState } from "@skylens-aviation/core";
import { ReplayEngine, ReplayFrame } from "./engine";

/** Focused view on a single aircraft during fleet replay */
export class PictureInPicture {
  private engine: ReplayEngine;
  private trackedIcao: string | null = null;
  private listeners: ((data: { aircraft: StateVector; camera: CameraState } | null) => void)[] = [];
  private unsubFrame: (() => void) | null = null;

  constructor(engine: ReplayEngine) {
    this.engine = engine;
  }

  track(icao24: string): void {
    this.trackedIcao = icao24;
    if (!this.unsubFrame) {
      this.unsubFrame = this.engine.onFrame((frame) => this.handleFrame(frame));
    }
  }

  untrack(): void {
    this.trackedIcao = null;
    if (this.unsubFrame) {
      this.unsubFrame();
      this.unsubFrame = null;
    }
    for (const l of this.listeners) l(null);
  }

  getTrackedFrame(): { aircraft: StateVector; camera: CameraState } | null {
    return this.lastFrame;
  }

  onUpdate(listener: (data: { aircraft: StateVector; camera: CameraState } | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private lastFrame: { aircraft: StateVector; camera: CameraState } | null = null;

  private handleFrame(frame: ReplayFrame): void {
    if (!this.trackedIcao) return;
    const aircraft = frame.aircraft.get(this.trackedIcao);
    if (!aircraft) {
      this.lastFrame = null;
      for (const l of this.listeners) l(null);
      return;
    }

    const camera: CameraState = {
      position: { x: aircraft.longitude, y: aircraft.latitude, z: aircraft.altitudeFt },
      target: { x: aircraft.longitude, y: aircraft.latitude, z: 0 },
      fov: 60,
      zoom: 14,
    };

    this.lastFrame = { aircraft, camera };
    for (const l of this.listeners) l(this.lastFrame);
  }
}
