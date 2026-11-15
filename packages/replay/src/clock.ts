export type ClockState = "playing" | "paused" | "stopped";

export class ReplayClock {
  private state: ClockState = "stopped";
  private currentTime: number = 0;
  private startTime: number = 0;
  private endTime: number = 0;
  private speed: number = 1;
  private lastTick: number = 0;
  private frameId: number | null = null;
  private listeners: Array<(time: number) => void> = [];

  configure(startTime: number, endTime: number, speed: number = 1): void {
    this.startTime = startTime;
    this.endTime = endTime;
    this.currentTime = startTime;
    this.speed = speed;
  }

  play(): void {
    if (this.state === "playing") return;
    this.state = "playing";
    this.lastTick = performance.now();
    this.tick();
  }

  pause(): void {
    this.state = "paused";
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  stop(): void {
    this.state = "stopped";
    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.currentTime = this.startTime;
  }

  seek(time: number): void {
    this.currentTime = Math.max(this.startTime, Math.min(this.endTime, time));
    this.emit();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getState(): ClockState { return this.state; }
  getTime(): number { return this.currentTime; }
  getSpeed(): number { return this.speed; }
  getProgress(): number {
    const range = this.endTime - this.startTime;
    return range > 0 ? (this.currentTime - this.startTime) / range : 0;
  }

  onTick(listener: (time: number) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private tick(): void {
    if (this.state !== "playing") return;
    const now = performance.now();
    const deltaMs = now - this.lastTick;
    this.lastTick = now;
    this.currentTime += (deltaMs / 1000) * this.speed;
    if (this.currentTime >= this.endTime) {
      this.currentTime = this.endTime;
      this.state = "paused";
      this.emit();
      return;
    }
    this.emit();
    this.frameId = requestAnimationFrame(() => this.tick());
  }

  private emit(): void {
    for (const l of this.listeners) l(this.currentTime);
  }
}
