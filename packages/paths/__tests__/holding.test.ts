import { describe, it, expect } from "vitest";
import { detectHoldingPatterns } from "../src/holding";
import { FlightTrack, StateVector } from "@skylens/core";

function makeCircularTrack(orbits: number): FlightTrack {
  const states: StateVector[] = [];
  const pointsPerOrbit = 36; // 10° per step for faster heading change
  const totalPoints = orbits * pointsPerOrbit;
  for (let i = 0; i < totalPoints; i++) {
    const angle = (i / pointsPerOrbit) * 360;
    states.push({
      icao24: "test",
      callsign: "TST",
      timestamp: i * 10,
      latitude: 40 + 0.05 * Math.sin((angle * Math.PI) / 180),
      longitude: -74 + 0.05 * Math.cos((angle * Math.PI) / 180),
      altitudeFt: 10000,
      groundSpeedKts: 200,
      trackDeg: (angle + 90) % 360, // tangent to circle
      verticalRateFpm: 0,
      onGround: false,
    });
  }
  return { icao24: "test", callsign: "TST", origin: null, destination: null, states };
}

describe("detectHoldingPatterns", () => {
  it("should detect a 3-orbit holding pattern", () => {
    const track = makeCircularTrack(3); // 108 points total, 10° per step
    const patterns = detectHoldingPatterns(track, { minOrbits: 1, windowSize: 20, minOrbitDeg: 180 });
    expect(patterns.length).toBeGreaterThanOrEqual(1);
    expect(patterns[0].orbits).toBeGreaterThanOrEqual(1);
  });

  it("should not detect holding in a straight flight", () => {
    const states: StateVector[] = Array.from({ length: 200 }, (_, i) => ({
      icao24: "test",
      callsign: "TST",
      timestamp: i,
      latitude: 40 + i * 0.001,
      longitude: -74,
      altitudeFt: 35000,
      groundSpeedKts: 450,
      trackDeg: 0,
      verticalRateFpm: 0,
      onGround: false,
    }));
    const track: FlightTrack = { icao24: "test", callsign: "TST", origin: null, destination: null, states };
    const patterns = detectHoldingPatterns(track);
    expect(patterns).toHaveLength(0);
  });
});
