import { describe, it, expect } from "vitest";
import { buildDensityGrid, normalizeHeatmap } from "../src/grid";
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

describe("buildDensityGrid", () => {
  it("should count states in correct cells", () => {
    const states = [makeState(0.5, 0.5), makeState(0.5, 0.5), makeState(9.5, 9.5)];
    const cells = buildDensityGrid(states, {
      bbox: { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 },
      latBins: 10,
      lonBins: 10,
    });
    // Should have 2 non-zero cells
    expect(cells.length).toBe(2);
    const cell1 = cells.find((c) => c.value === 2);
    expect(cell1).toBeDefined();
  });

  it("should exclude states outside bbox", () => {
    const states = [makeState(-10, -10), makeState(50, 50)];
    const cells = buildDensityGrid(states, {
      bbox: { minLat: 0, maxLat: 10, minLon: 0, maxLon: 10 },
      latBins: 5,
      lonBins: 5,
    });
    expect(cells).toHaveLength(0);
  });
});

describe("normalizeHeatmap", () => {
  it("should normalize values to [0, 1]", () => {
    const cells = [
      { lat: 0, lon: 0, value: 10 },
      { lat: 1, lon: 1, value: 5 },
      { lat: 2, lon: 2, value: 20 },
    ];
    const normalized = normalizeHeatmap(cells);
    expect(normalized.find((c) => c.value === 1)!.lat).toBe(2);
    expect(normalized.find((c) => c.lat === 1)!.value).toBeCloseTo(0.25);
    for (const c of normalized) {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(1);
    }
  });

  it("should return empty for empty input", () => {
    expect(normalizeHeatmap([])).toHaveLength(0);
  });
});
