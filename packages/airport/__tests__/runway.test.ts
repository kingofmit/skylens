import { describe, it, expect } from "vitest";
import { detectRunwayEvents, runwayUtilization, RunwayDefinition } from "../src/runway";
import { FlightTrack } from "@skylens/core";

const runways: RunwayDefinition[] = [
  { name: "09L", thresholdLat: 40.64, thresholdLon: -73.79, headingDeg: 90, lengthM: 3000 },
  { name: "27R", thresholdLat: 40.64, thresholdLon: -73.76, headingDeg: 270, lengthM: 3000 },
];

describe("detectRunwayEvents", () => {
  it("should detect a departure", () => {
    const track: FlightTrack = {
      icao24: "abc123",
      callsign: "TST1",
      origin: null,
      destination: null,
      states: [
        { icao24: "abc123", callsign: "TST1", timestamp: 100, latitude: 40.64, longitude: -73.79, altitudeFt: 0, groundSpeedKts: 150, trackDeg: 90, verticalRateFpm: 0, onGround: true },
        { icao24: "abc123", callsign: "TST1", timestamp: 130, latitude: 40.64, longitude: -73.78, altitudeFt: 500, groundSpeedKts: 170, trackDeg: 90, verticalRateFpm: 2000, onGround: false },
      ],
    };
    const events = detectRunwayEvents([track], runways);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("departure");
    expect(events[0].runway).toBe("09L");
  });

  it("should detect an arrival", () => {
    const track: FlightTrack = {
      icao24: "def456",
      callsign: "TST2",
      origin: null,
      destination: null,
      states: [
        { icao24: "def456", callsign: "TST2", timestamp: 200, latitude: 40.64, longitude: -73.77, altitudeFt: 200, groundSpeedKts: 140, trackDeg: 270, verticalRateFpm: -800, onGround: false },
        { icao24: "def456", callsign: "TST2", timestamp: 230, latitude: 40.64, longitude: -73.78, altitudeFt: 0, groundSpeedKts: 60, trackDeg: 270, verticalRateFpm: 0, onGround: true },
      ],
    };
    const events = detectRunwayEvents([track], runways);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("arrival");
  });
});

describe("runwayUtilization", () => {
  it("should count operations correctly", () => {
    const events = [
      { icao24: "a", callsign: null, runway: "09L", type: "departure" as const, time: 100 },
      { icao24: "b", callsign: null, runway: "09L", type: "departure" as const, time: 200 },
      { icao24: "c", callsign: null, runway: "09L", type: "arrival" as const, time: 300 },
    ];
    const util = runwayUtilization(events, { start: 0, end: 400 });
    const stats = util.get("09L");
    expect(stats).toBeDefined();
    expect(stats!.departures).toBe(2);
    expect(stats!.arrivals).toBe(1);
    expect(stats!.operations).toBe(3);
  });
});
