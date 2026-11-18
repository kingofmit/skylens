import { ReplayEngine, ReplayFrame } from "./engine";

/** Records replay frames at a specified FPS during playback */
export class FrameRecorder {
  private engine: ReplayEngine;
  private frames: ReplayFrame[] = [];
  private recording = false;
  private fps: number = 30;
  private lastCaptureTime = 0;
  private unsubFrame: (() => void) | null = null;

  constructor(engine: ReplayEngine) {
    this.engine = engine;
  }

  startRecording(fps: number = 30): void {
    this.fps = fps;
    this.frames = [];
    this.recording = true;
    this.lastCaptureTime = 0;

    this.unsubFrame = this.engine.onFrame((frame) => {
      if (!this.recording) return;

      const interval = 1 / this.fps;
      if (this.lastCaptureTime === 0 || frame.time - this.lastCaptureTime >= interval) {
        this.frames.push({
          time: frame.time,
          aircraft: new Map(frame.aircraft),
        });
        this.lastCaptureTime = frame.time;
      }
    });
  }

  stopRecording(): ReplayFrame[] {
    this.recording = false;
    if (this.unsubFrame) {
      this.unsubFrame();
      this.unsubFrame = null;
    }
    return [...this.frames];
  }

  getRecordedFrames(): ReplayFrame[] {
    return [...this.frames];
  }

  isRecording(): boolean {
    return this.recording;
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}
