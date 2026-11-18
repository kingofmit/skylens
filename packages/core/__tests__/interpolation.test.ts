import { describe, it, expect } from "vitest";
import { interpolateState, catmullRomInterpolate } from "../src/interpolation";
import { StateVector } from "../src/types";

const makeState = (t: number, lat: number, track: number): StateVector => ({
  icao24: "abc123",
  callsign: "TEST",
  timestamp: t,
  latitude: lat,
  longitude: 0,
  altitudeFt: 10000,
  groundSpeedKts: 250,
  trackDeg: track,
  verticalRateFpm: 0,
  onGround: false,
});

describe("interpolateState", () => {
  it("should return midpoint at halfway timestamp", () => {
    const a = makeState(0, 10, 0);
    const b = makeState(10, 20, 0);
    const mid = interpolateState(a, b, 5);
    expect(mid.latitude).toBeCloseTo(15);
    expect(mid.timestamp).toBe(5);
  });

  it("should handle angle wraparound (359° → 1°)", () => {
    const a = makeState(0, 0, 359);
    const b = makeState(10, 0, 1);
    const mid = interpolateState(a, b, 5);
    expect(mid.trackDeg).toBeCloseTo(0, 0);
  });

  it("should return copy when timestamps are equal", () => {
    const a = makeState(5, 10, 90);
    const b = makeState(5, 20, 180);
    const result = interpolateState(a, b, 5);
    expect(result.latitude).toBe(10);
  });
});

describe("catmullRomInterpolate", () => {
  it("should pass through p1 at t=0", () => {
    expect(catmullRomInterpolate(0, 10, 20, 30, 0)).toBeCloseTo(10);
  });

  it("should pass through p2 at t=1", () => {
    expect(catmullRomInterpolate(0, 10, 20, 30, 1)).toBeCloseTo(20);
  });

  it("should produce smooth values at t=0.5", () => {
    const v = catmullRomInterpolate(0, 10, 20, 30, 0.5);
    expect(v).toBeGreaterThan(10);
    expect(v).toBeLessThan(20);
  });
});
