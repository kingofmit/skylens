import { StateVector } from "@skylens/core";

/** A replay frame for export (mirrors ReplayFrame from @skylens/replay) */
export interface ExportFrame {
  time: number;
  aircraft: Map<string, StateVector>;
}

/** Exports replay frames for video generation (consumer provides rendering) */
export class ReplayFrameExporter {
  private frames: ExportFrame[];

  constructor(frames: ExportFrame[]) {
    this.frames = frames;
  }

  /** Get the number of recorded frames */
  getFrameCount(): number {
    return this.frames.length;
  }

  /** Get a specific frame by index */
  getFrame(index: number): ExportFrame | null {
    return this.frames[index] ?? null;
  }

  /** Get all frames */
  getFrames(): ExportFrame[] {
    return [...this.frames];
  }

  /** Get the time range of recorded frames */
  getTimeRange(): { start: number; end: number } | null {
    if (this.frames.length === 0) return null;
    return {
      start: this.frames[0].time,
      end: this.frames[this.frames.length - 1].time,
    };
  }

  /** Compute effective FPS from recorded frame timestamps */
  getEffectiveFPS(): number {
    if (this.frames.length < 2) return 0;
    const duration = this.frames[this.frames.length - 1].time - this.frames[0].time;
    return duration > 0 ? (this.frames.length - 1) / duration : 0;
  }
}
