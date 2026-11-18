import { describe, it, expect } from "vitest";
import { buildHexBinHeatmap, normalizeHexBins } from "../src/hexbin";
import { StateVector } from "@skylens-aviation/core";

const makeState = (lat: number, lon: number): StateVector => ({
  icao24: "test",
  callsign: null,
  timestamp: 0,
  latitude: lat,
  longitude: lon,
  altitudeFt: 30000,
  groundSpeedKts: 400,
  trackDeg: 0,
  verticalRateFpm: 0,
  onGround: false,
});

describe("buildHexBinHeatmap", () => {
  it("should preserve total count", () => {
    const n = 100;
    const states = Array.from({ length: n }, (_, i) =>
      makeState(40 + Math.random() * 5, -74 + Math.random() * 5),
    );
    const bbox = { minLat: 40, maxLat: 45, minLon: -74, maxLon: -69 };
    const cells = buildHexBinHeatmap(states, bbox, 0.5);
    const totalCount = cells.reduce((s, c) => s + c.value, 0);
    expect(totalCount).toBe(n);
  });

  it("should return empty for no states in bbox", () => {
    const states = [makeState(0, 0)];
    const bbox = { minLat: 40, maxLat: 45, minLon: -74, maxLon: -69 };
    const cells = buildHexBinHeatmap(states, bbox, 0.5);
    expect(cells).toHaveLength(0);
  });
});

describe("normalizeHexBins", () => {
  it("should normalize to [0, 1]", () => {
    const cells = [
      { centerLat: 0, centerLon: 0, radius: 1, value: 10 },
      { centerLat: 1, centerLon: 1, radius: 1, value: 5 },
    ];
    const norm = normalizeHexBins(cells);
    expect(norm[0].value).toBe(1);
    expect(norm[1].value).toBe(0.5);
  });
});
