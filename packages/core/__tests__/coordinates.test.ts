import { describe, it, expect } from "vitest";
import {
  haversineDistance,
  bearing,
  geoToEnu,
  enuToGeo,
  ftToM,
  mToFt,
  greatCircleInterpolate,
  greatCircleArc,
  toMercator,
  fromMercator,
  toWebMercator,
  fromWebMercator,
} from "../src/coordinates";

describe("haversineDistance", () => {
  it("should compute JFK to LHR distance (~5,539 km)", () => {
    const d = haversineDistance(40.6413, -73.7781, 51.4700, -0.4543);
    expect(d).toBeGreaterThan(5_500_000);
    expect(d).toBeLessThan(5_600_000);
  });

  it("should return 0 for same point", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });
});

describe("bearing", () => {
  it("should compute north as ~0°", () => {
    const b = bearing(0, 0, 1, 0);
    expect(b).toBeCloseTo(0, 0);
  });

  it("should compute east as ~90°", () => {
    const b = bearing(0, 0, 0, 1);
    expect(b).toBeCloseTo(90, 0);
  });
});

describe("geoToEnu / enuToGeo round-trip", () => {
  it("should round-trip within tolerance", () => {
    const lat = 40.6413;
    const lon = -73.7781;
    const alt = 1000;
    const enu = geoToEnu(lat, lon, alt, 40, -74);
    const geo = enuToGeo(enu, 40, -74);
    expect(geo.latitude).toBeCloseTo(lat, 4);
    expect(geo.longitude).toBeCloseTo(lon, 4);
    expect(geo.altitudeM).toBeCloseTo(alt, 4);
  });
});

describe("unit conversions", () => {
  it("should convert ft to m", () => {
    expect(ftToM(1000)).toBeCloseTo(304.8);
  });
  it("should convert m to ft", () => {
    expect(mToFt(304.8)).toBeCloseTo(1000);
  });
});

describe("greatCircleInterpolate", () => {
  it("should return start at fraction=0", () => {
    const p = greatCircleInterpolate(0, 0, 10, 10, 0);
    expect(p.lat).toBeCloseTo(0);
    expect(p.lon).toBeCloseTo(0);
  });

  it("should return end at fraction=1", () => {
    const p = greatCircleInterpolate(0, 0, 10, 10, 1);
    expect(p.lat).toBeCloseTo(10, 4);
    expect(p.lon).toBeCloseTo(10, 4);
  });

  it("should return midpoint at fraction=0.5", () => {
    const p = greatCircleInterpolate(0, 0, 0, 10, 0.5);
    expect(p.lat).toBeCloseTo(0, 1);
    expect(p.lon).toBeCloseTo(5, 1);
  });
});

describe("greatCircleArc", () => {
  it("should generate correct number of points", () => {
    const arc = greatCircleArc(0, 0, 10, 10, 5);
    expect(arc).toHaveLength(5);
  });
});

describe("Mercator projections", () => {
  it("toMercator/fromMercator should round-trip", () => {
    const { x, y } = toMercator(45, 90);
    const { lat, lon } = fromMercator(x, y);
    expect(lat).toBeCloseTo(45, 4);
    expect(lon).toBeCloseTo(90, 4);
  });

  it("toWebMercator should clamp latitude", () => {
    const { x: x1 } = toWebMercator(86, 0);
    const { x: x2 } = toWebMercator(85.051, 0);
    // Both should use clamped lat
    expect(x1).toBeCloseTo(x2, 0);
  });

  it("fromWebMercator should match fromMercator", () => {
    const merc = toMercator(40, -74);
    const r1 = fromMercator(merc.x, merc.y);
    const r2 = fromWebMercator(merc.x, merc.y);
    expect(r1.lat).toBeCloseTo(r2.lat);
    expect(r1.lon).toBeCloseTo(r2.lon);
  });
});
