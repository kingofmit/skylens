import { describe, it, expect } from "vitest";
import { parseMETAR } from "../src/metar";

describe("parseMETAR", () => {
  it("should parse a real METAR string", () => {
    const raw = "KJFK 151856Z 31015G25KT 10SM FEW250 M05/M18 A3032";
    const metar = parseMETAR(raw, 40.6413, -73.7781);

    expect(metar.station).toBe("KJFK");
    expect(metar.windDir).toBe(310);
    expect(metar.windSpeedKts).toBe(15);
    expect(metar.windGustKts).toBe(25);
    expect(metar.visibility).toBe(10);
    expect(metar.tempC).toBe(-5);
    expect(metar.dewpointC).toBe(-18);
    expect(metar.altimeterInHg).toBeCloseTo(30.32);
    expect(metar.flightCategory).toBe("VFR");
    expect(metar.lat).toBe(40.6413);
    expect(metar.lon).toBe(-73.7781);
  });

  it("should parse METAR with ceiling", () => {
    const raw = "KORD 151856Z 18010KT 3SM BR OVC005 02/01 A2990";
    const metar = parseMETAR(raw);

    expect(metar.ceiling).toBe(500);
    expect(metar.visibility).toBe(3);
    expect(metar.flightCategory).toBe("IFR");
  });

  it("should classify LIFR correctly", () => {
    const raw = "KSFO 151856Z 27005KT 1/2SM FG VV001 10/10 A3000";
    const metar = parseMETAR(raw);

    expect(metar.ceiling).toBe(100);
    expect(metar.flightCategory).toBe("LIFR");
  });

  it("should handle VRB wind", () => {
    const raw = "KBOS 151856Z VRB03KT 10SM SCT250 15/05 A3010";
    const metar = parseMETAR(raw);

    expect(metar.windDir).toBe(0);
    expect(metar.windSpeedKts).toBe(3);
  });
});
