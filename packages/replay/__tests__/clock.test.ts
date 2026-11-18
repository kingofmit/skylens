import { describe, it, expect } from "vitest";
import { ReplayClock } from "../src/clock";

describe("ReplayClock", () => {
  it("should start in stopped state", () => {
    const clock = new ReplayClock();
    expect(clock.getState()).toBe("stopped");
  });

  it("should configure time range", () => {
    const clock = new ReplayClock();
    clock.configure(100, 200);
    expect(clock.getTime()).toBe(100);
  });

  it("should clamp seek to range", () => {
    const clock = new ReplayClock();
    clock.configure(100, 200);
    clock.seek(300);
    expect(clock.getTime()).toBe(200);
    clock.seek(50);
    expect(clock.getTime()).toBe(100);
  });

  it("should set speed", () => {
    const clock = new ReplayClock();
    clock.setSpeed(2);
    expect(clock.getSpeed()).toBe(2);
  });

  it("should transition states correctly", () => {
    // Mock requestAnimationFrame for Node environment
    const origRAF = globalThis.requestAnimationFrame;
    const origCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(cb, 0)) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = clearTimeout as typeof cancelAnimationFrame;

    try {
      const clock = new ReplayClock();
      clock.configure(0, 100);
      clock.play();
      expect(clock.getState()).toBe("playing");
      clock.pause();
      expect(clock.getState()).toBe("paused");
      clock.stop();
      expect(clock.getState()).toBe("stopped");
    } finally {
      if (origRAF) globalThis.requestAnimationFrame = origRAF;
      else delete (globalThis as Record<string, unknown>).requestAnimationFrame;
      if (origCAF) globalThis.cancelAnimationFrame = origCAF;
      else delete (globalThis as Record<string, unknown>).cancelAnimationFrame;
    }
  });

  it("should report progress", () => {
    const clock = new ReplayClock();
    clock.configure(0, 100);
    expect(clock.getProgress()).toBe(0);
    clock.seek(50);
    expect(clock.getProgress()).toBeCloseTo(0.5);
    clock.seek(100);
    expect(clock.getProgress()).toBeCloseTo(1);
  });
});
