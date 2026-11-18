import { describe, it, expect } from "vitest";
import { detectFlightPhases, phaseAtTime } from "../src/phases";
import { FlightTrack, StateVector } from "@skylens-aviation/core";

function makeTrack(stateData: Partial<StateVector>[]): FlightTrack {
  const states: StateVector[] = stateData.map((d, i) => ({
    icao24: "test",
    callsign: "TST001",
    timestamp: i * 30,
    latitude: 40 + i * 0.1,
    longitude: -74,
    altitudeFt: 0,
    groundSpeedKts: 0,
    trackDeg: 0,
    verticalRateFpm: 0,
    onGround: false,
    ...d,
  }));
  return { icao24: "test", callsign: "TST001", origin: null, destination: null, states };
}

describe("detectFlightPhases", () => {
  it("should detect ground phase", () => {
    const track = makeTrack(
      Array(10).fill({ onGround: true, altitudeFt: 0, groundSpeedKts: 5, verticalRateFpm: 0 }),
    );
    const phases = detectFlightPhases(track);
    expect(phases.length).toBeGreaterThanOrEqual(1);
    expect(phases[0].phase).toBe("ground");
  });

  it("should detect climb phase", () => {
    const track = makeTrack(
      Array(10).fill({ onGround: false, altitudeFt: 5000, groundSpeedKts: 250, verticalRateFpm: 2000 }),
    );
    const phases = detectFlightPhases(track);
    expect(phases.some((p) => p.phase === "climb")).toBe(true);
  });

  it("should detect cruise phase", () => {
    const track = makeTrack(
      Array(10).fill({ onGround: false, altitudeFt: 35000, groundSpeedKts: 450, verticalRateFpm: 0 }),
    );
    const phases = detectFlightPhases(track);
    expect(phases.some((p) => p.phase === "cruise")).toBe(true);
  });
});

describe("phaseAtTime", () => {
  it("should return the phase at a given time", () => {
    const phases = [
      { phase: "ground" as const, startIndex: 0, endIndex: 5, startTime: 0, endTime: 150 },
      { phase: "climb" as const, startIndex: 6, endIndex: 15, startTime: 180, endTime: 450 },
    ];
    expect(phaseAtTime(phases, 100)).toBe("ground");
    expect(phaseAtTime(phases, 300)).toBe("climb");
    expect(phaseAtTime(phases, 500)).toBeNull();
  });
});
