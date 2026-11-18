import { describe, it, expect } from "vitest";
import { pointInPolygon, findContainingSectors } from "../src/geometry";

describe("pointInPolygon", () => {
  const square = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 10 },
    { lat: 10, lon: 10 },
    { lat: 10, lon: 0 },
  ];

  it("should return true for point inside", () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
  });

  it("should return false for point outside", () => {
    expect(pointInPolygon(15, 15, square)).toBe(false);
  });

  it("should return false for point clearly outside", () => {
    expect(pointInPolygon(-5, -5, square)).toBe(false);
  });

  it("should work with an L-shaped polygon", () => {
    const lShape = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 5 },
      { lat: 5, lon: 5 },
      { lat: 5, lon: 10 },
      { lat: 10, lon: 10 },
      { lat: 10, lon: 0 },
    ];
    expect(pointInPolygon(7, 7, lShape)).toBe(true);
    expect(pointInPolygon(2, 7, lShape)).toBe(false);
  });
});

describe("findContainingSectors", () => {
  it("should filter by altitude range", () => {
    const sectors = [
      {
        id: "low",
        name: "Low",
        type: "TMA",
        polygon: [{ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }],
        altRange: { minFl: 0, maxFl: 100 },
      },
      {
        id: "high",
        name: "High",
        type: "FIR",
        polygon: [{ lat: 0, lon: 0 }, { lat: 0, lon: 10 }, { lat: 10, lon: 10 }, { lat: 10, lon: 0 }],
        altRange: { minFl: 100, maxFl: 600 },
      },
    ];

    const low = findContainingSectors(5, 5, 50, sectors);
    expect(low).toHaveLength(1);
    expect(low[0].id).toBe("low");

    const high = findContainingSectors(5, 5, 350, sectors);
    expect(high).toHaveLength(1);
    expect(high[0].id).toBe("high");
  });
});
