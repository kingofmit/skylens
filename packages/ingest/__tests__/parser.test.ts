import { describe, it, expect } from "vitest";
import { parseSBS, assembleFlightTracks } from "../src/parser";

describe("parseSBS", () => {
  it("should parse MSG,3 lines", () => {
    // SBS MSG,3 fields: 0=MSG,1=3,2,3,4=icao,5,6=date,7=time,8=date,9=time,10=callsign,11=alt,12=speed,13=track,14=lat,15=lon,16=vrate,...
    const csv = "MSG,3,1,1,AB1234,1,2024/01/15,12:00:00.000,2024/01/15,12:00:00.000,TEST,35000,250,180,51.5,-0.1,0,0,0,0,0,0";
    const states = parseSBS(csv);
    expect(states).toHaveLength(1);
    expect(states[0].icao24).toBe("AB1234");
    expect(states[0].latitude).toBe(51.5);
    expect(states[0].longitude).toBe(-0.1);
    expect(states[0].altitudeFt).toBe(35000);
  });

  it("should skip non-MSG,3 lines", () => {
    const csv = `MSG,1,1,1,AB1234,1,2024/01/15,12:00:00.000,,,,,,,,,`;
    const states = parseSBS(csv);
    expect(states).toHaveLength(0);
  });
});

describe("assembleFlightTracks", () => {
  it("should group states by icao24", () => {
    const states = [
      { icao24: "aaa", callsign: null, timestamp: 1, latitude: 0, longitude: 0, altitudeFt: 0, groundSpeedKts: 0, trackDeg: 0, verticalRateFpm: 0, onGround: false },
      { icao24: "bbb", callsign: null, timestamp: 2, latitude: 0, longitude: 0, altitudeFt: 0, groundSpeedKts: 0, trackDeg: 0, verticalRateFpm: 0, onGround: false },
      { icao24: "aaa", callsign: null, timestamp: 3, latitude: 0, longitude: 0, altitudeFt: 0, groundSpeedKts: 0, trackDeg: 0, verticalRateFpm: 0, onGround: false },
    ];
    const tracks = assembleFlightTracks(states);
    expect(tracks).toHaveLength(2);
    const aaTrack = tracks.find((t) => t.icao24 === "aaa");
    expect(aaTrack!.states).toHaveLength(2);
  });
});
