import { describe, it, expect } from "vitest";
import { latLonToTile, tileToLatLon, tileBounds, tilesInBBox } from "../src/tiles";

describe("latLonToTile", () => {
  it("should convert (0, 0) at zoom 0 to tile (0, 0, 0)", () => {
    const t = latLonToTile(0, 0, 0);
    expect(t).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("should convert known location at zoom 10", () => {
    // London (~51.5, -0.1) at zoom 10
    const t = latLonToTile(51.5, -0.1, 10);
    expect(t.x).toBe(511);
    expect(t.y).toBe(340);
    expect(t.z).toBe(10);
  });
});

describe("tileToLatLon", () => {
  it("should convert tile (0, 0, 0) to NW corner", () => {
    const { lat, lon } = tileToLatLon(0, 0, 0);
    expect(lat).toBeCloseTo(85.0511, 1);
    expect(lon).toBeCloseTo(-180);
  });
});

describe("tileBounds", () => {
  it("should return valid bounding box", () => {
    const bbox = tileBounds(511, 340, 10);
    expect(bbox.maxLat).toBeGreaterThan(bbox.minLat);
    expect(bbox.maxLon).toBeGreaterThan(bbox.minLon);
  });
});

describe("tilesInBBox", () => {
  it("should return at least 1 tile", () => {
    const tiles = tilesInBBox({ minLat: 51, maxLat: 52, minLon: -1, maxLon: 0 }, 10);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) expect(t.z).toBe(10);
  });
});
