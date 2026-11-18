import { describe, it, expect } from "vitest";
import { SpatialIndex } from "../src/spatial-index";

describe("SpatialIndex", () => {
  it("should insert and query by bbox", () => {
    const idx = new SpatialIndex(1);
    idx.insert("a", 10.5, 20.5);
    idx.insert("b", 10.8, 20.8);
    idx.insert("c", 50, 50);

    const results = idx.queryBBox({ minLat: 10, maxLat: 11, minLon: 20, maxLon: 21 });
    expect(results).toContain("a");
    expect(results).toContain("b");
    expect(results).not.toContain("c");
  });

  it("should query by radius", () => {
    const idx = new SpatialIndex(0.1);
    idx.insert("a", 0, 0);
    idx.insert("b", 0.001, 0.001);
    idx.insert("c", 10, 10);

    const results = idx.queryRadius(0, 0, 1000); // 1 km
    expect(results).toContain("a");
    expect(results).toContain("b");
    expect(results).not.toContain("c");
  });

  it("should remove entries", () => {
    const idx = new SpatialIndex(1);
    idx.insert("a", 10, 20);
    expect(idx.size).toBe(1);
    expect(idx.remove("a")).toBe(true);
    expect(idx.size).toBe(0);
    expect(idx.queryBBox({ minLat: 0, maxLat: 90, minLon: 0, maxLon: 90 })).toHaveLength(0);
  });

  it("should handle bulk insert", () => {
    const idx = new SpatialIndex(1);
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `point-${i}`,
      lat: Math.random() * 180 - 90,
      lon: Math.random() * 360 - 180,
    }));
    idx.bulkInsert(items);
    expect(idx.size).toBe(100);
  });

  it("should clear all entries", () => {
    const idx = new SpatialIndex(1);
    idx.bulkInsert([
      { id: "a", lat: 0, lon: 0 },
      { id: "b", lat: 1, lon: 1 },
    ]);
    idx.clear();
    expect(idx.size).toBe(0);
  });
});
