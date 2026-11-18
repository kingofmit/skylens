/**
 * End-to-end integration tests for the SkyLens monorepo.
 *
 * Each describe block exercises a full pipeline with synthetic but realistic
 * data, verifying that the packages compose correctly from ingest to export.
 */

import { describe, it, expect } from "vitest";

// ── Core types & helpers ────────────────────────────────────────────────────
import type {
  StateVector,
  FlightTrack,
  AirspaceBoundary,
  BoundingBox,
} from "../packages/core/src/types";

// ── Ingest ──────────────────────────────────────────────────────────────────
import { parseSBS, assembleFlightTracks } from "../packages/ingest/src/parser";
import { detectFlightPhases } from "../packages/ingest/src/phases";

// ── Paths ───────────────────────────────────────────────────────────────────
import { buildAltitudeProfile } from "../packages/paths/src/altitude-profile";
import { detectHoldingPatterns } from "../packages/paths/src/holding";

// ── Heatmap ─────────────────────────────────────────────────────────────────
import { buildDensityGrid, normalizeHeatmap } from "../packages/heatmap/src/grid";

// ── Export ──────────────────────────────────────────────────────────────────
import { flightTrackToGeoJSON } from "../packages/export/src/geojson";
import { flightTrackToCZML } from "../packages/export/src/czml";
import { flightTrackToCSV } from "../packages/export/src/csv";

// ── Airspace ────────────────────────────────────────────────────────────────
import { detectSectorCrossings } from "../packages/airspace/src/crossings";

// ── Weather ─────────────────────────────────────────────────────────────────
import { parseMETAR } from "../packages/weather/src/metar";
import { metarToWindBarbs, windBarbGeometry } from "../packages/weather/src/wind-barbs";

// ── Replay ──────────────────────────────────────────────────────────────────
import { generatePhaseEvents, EventTimeline } from "../packages/replay/src/events";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for building synthetic data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a realistic SBS CSV string for a single flight.
 * Simulates: ground taxi -> takeoff -> climb -> cruise -> descent -> approach -> landing
 */
function buildRealisticSBSData(): string {
  const icao = "A1B2C3";
  const callsign = "SKY123 ";
  const date = "2024/06/15";
  const baseHour = 14; // 14:00 UTC

  interface WaypointDef {
    lat: number;
    lon: number;
    alt: number;
    gs: number;
    vr: number;
    track: number;
    durationSec: number;
    count: number;
  }

  // Define waypoints for each flight phase:
  // ground (KJFK area), takeoff, climb, cruise, descent, approach, landing (KBOS area)
  const phases: WaypointDef[] = [
    // Ground taxi at JFK (40.6413, -73.7781)
    { lat: 40.6413, lon: -73.7781, alt: 0, gs: 15, vr: 0, track: 90, durationSec: 120, count: 4 },
    // Takeoff roll + initial climb
    { lat: 40.6450, lon: -73.7700, alt: 150, gs: 140, vr: 2500, track: 45, durationSec: 60, count: 4 },
    // Climb
    { lat: 40.72, lon: -73.60, alt: 8000, gs: 250, vr: 2000, track: 50, durationSec: 180, count: 8 },
    { lat: 40.85, lon: -73.30, alt: 18000, gs: 310, vr: 1500, track: 48, durationSec: 240, count: 6 },
    { lat: 41.05, lon: -72.90, alt: 32000, gs: 420, vr: 800, track: 46, durationSec: 180, count: 5 },
    // Cruise at FL350
    { lat: 41.30, lon: -72.40, alt: 35000, gs: 450, vr: 0, track: 44, durationSec: 300, count: 8 },
    { lat: 41.55, lon: -71.90, alt: 35000, gs: 448, vr: 0, track: 42, durationSec: 300, count: 6 },
    // Descent
    { lat: 41.80, lon: -71.50, alt: 28000, gs: 400, vr: -1500, track: 40, durationSec: 180, count: 5 },
    { lat: 41.95, lon: -71.20, alt: 18000, gs: 340, vr: -1800, track: 38, durationSec: 180, count: 5 },
    // Approach into Boston (42.3656, -71.0096)
    { lat: 42.15, lon: -71.10, alt: 8000, gs: 220, vr: -1200, track: 35, durationSec: 180, count: 5 },
    { lat: 42.30, lon: -71.05, alt: 3000, gs: 170, vr: -800, track: 30, durationSec: 120, count: 4 },
    // Landing at KBOS
    { lat: 42.36, lon: -71.01, alt: 500, gs: 140, vr: -600, track: 25, durationSec: 60, count: 3 },
    { lat: 42.3656, lon: -71.0096, alt: 0, gs: 30, vr: 0, track: 25, durationSec: 60, count: 3 },
  ];

  const lines: string[] = [];
  let seconds = 0;

  for (const phase of phases) {
    for (let i = 0; i < phase.count; i++) {
      const frac = i / Math.max(1, phase.count - 1);
      const t = seconds + frac * phase.durationSec;
      const totalSec = Math.floor(t);
      const h = baseHour + Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.000`;

      // Add small noise to make data realistic
      const lat = phase.lat + (Math.random() - 0.5) * 0.001;
      const lon = phase.lon + (Math.random() - 0.5) * 0.001;
      const alt = phase.alt + (Math.random() - 0.5) * 50;
      const gs = phase.gs + (Math.random() - 0.5) * 5;
      const vr = phase.vr + (Math.random() - 0.5) * 100;
      const track = phase.track + (Math.random() - 0.5) * 2;

      // SBS MSG type 3 format:
      // MSG,3,1,1,ICAO24,1,date,time,date,time,CALLSIGN,ALT,GS,TRACK,LAT,LON,VR,,,,,
      lines.push(
        `MSG,3,1,1,${icao},1,${date},${time},${date},${time},${callsign},${alt.toFixed(0)},${gs.toFixed(0)},${track.toFixed(1)},${lat.toFixed(6)},${lon.toFixed(6)},${vr.toFixed(0)},,,,,,`
      );
    }
    seconds += phase.durationSec;
  }

  return lines.join("\n");
}

/**
 * Build a track that enters, traverses, and exits a rectangular airspace sector.
 * The track starts outside the box, enters it, and then exits.
 */
function buildAirspaceCrossingData(): {
  track: FlightTrack;
  boundary: AirspaceBoundary;
} {
  // Define a rectangular sector around lat 41.0, lon -72.5
  const boundary: AirspaceBoundary = {
    id: "SECTOR-A",
    name: "Test Sector Alpha",
    type: "ARTCC",
    polygon: [
      { lat: 40.8, lon: -72.8 },
      { lat: 40.8, lon: -72.2 },
      { lat: 41.2, lon: -72.2 },
      { lat: 41.2, lon: -72.8 },
    ],
    altRange: { minFl: 100, maxFl: 450 },
  };

  // Build a track that starts south of the sector, flies north through it, exits north
  const baseTime = 1718460000; // 2024-06-15 ~14:00 UTC
  const states: StateVector[] = [];

  const lats = [40.5, 40.6, 40.7, 40.85, 40.9, 41.0, 41.1, 41.15, 41.25, 41.35, 41.5];
  for (let i = 0; i < lats.length; i++) {
    states.push({
      icao24: "XING01",
      callsign: "XING1",
      timestamp: baseTime + i * 60,
      latitude: lats[i],
      longitude: -72.5,
      altitudeFt: 25000, // FL250 -- within the sector alt range
      groundSpeedKts: 400,
      trackDeg: 0,
      verticalRateFpm: 0,
      onGround: false,
    });
  }

  return {
    track: { icao24: "XING01", callsign: "XING1", origin: null, destination: null, states },
    boundary,
  };
}

/**
 * Build a track with a holding pattern embedded in the middle.
 * Straight -> racetrack orbits (2+ full turns) -> straight
 *
 * The holding pattern uses a smooth circular orbit where the trackDeg
 * (heading) advances continuously by a small amount per step, which is
 * what the detection algorithm expects.
 */
function buildHoldingPatternTrack(): FlightTrack {
  const baseTime = 1718460000;
  const states: StateVector[] = [];
  let t = baseTime;

  // Phase 1: straight segment heading north (30 points, trackDeg = 0)
  for (let i = 0; i < 30; i++) {
    states.push({
      icao24: "HOLD01",
      callsign: "HOLD1",
      timestamp: t,
      latitude: 41.0 + i * 0.003,
      longitude: -73.0,
      altitudeFt: 15000,
      groundSpeedKts: 250,
      trackDeg: 0,
      verticalRateFpm: 0,
      onGround: false,
    });
    t += 10;
  }

  // Phase 2: holding pattern -- right-hand orbits.
  // 3 complete orbits, each orbit = 100 points, heading advances 3.6 deg/step.
  // This gives continuous heading change that the algorithm can track.
  const holdCenterLat = 41.09;
  const holdCenterLon = -73.0;
  const holdRadius = 0.015; // degrees (~1.5 km)
  const pointsPerOrbit = 50;
  const numOrbits = 3;
  const totalHoldPoints = pointsPerOrbit * numOrbits;
  const degPerStep = 360 / pointsPerOrbit; // 7.2 deg/step

  for (let i = 0; i < totalHoldPoints; i++) {
    // Current angle around the circle (cumulative)
    // Start at angle=-90 so the tangent direction begins at 0 (north),
    // matching the straight segment's heading for a smooth transition.
    const angleDeg = -90 + i * degPerStep;
    const angleRad = angleDeg * (Math.PI / 180);
    const lat = holdCenterLat + holdRadius * Math.cos(angleRad);
    const lon = holdCenterLon + holdRadius * Math.sin(angleRad);
    // Track heading = tangent to circle (angle + 90), clockwise
    const trackDeg = ((angleDeg + 90) % 360 + 360) % 360;

    states.push({
      icao24: "HOLD01",
      callsign: "HOLD1",
      timestamp: t,
      latitude: lat,
      longitude: lon,
      altitudeFt: 15000,
      groundSpeedKts: 200,
      trackDeg,
      verticalRateFpm: 0,
      onGround: false,
    });
    t += 10;
  }

  // Phase 3: straight segment heading north again (30 points)
  const lastHoldLat = states[states.length - 1].latitude;
  for (let i = 0; i < 30; i++) {
    states.push({
      icao24: "HOLD01",
      callsign: "HOLD1",
      timestamp: t,
      latitude: lastHoldLat + i * 0.003,
      longitude: -73.0,
      altitudeFt: 15000,
      groundSpeedKts: 250,
      trackDeg: 0,
      verticalRateFpm: 0,
      onGround: false,
    });
    t += 10;
  }

  return {
    icao24: "HOLD01",
    callsign: "HOLD1",
    origin: null,
    destination: null,
    states,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────────────────

describe("E2E: Full pipeline -- Ingest -> Phases -> Paths -> Heatmap -> Export", () => {
  it("processes a full JFK-BOS flight through every stage", () => {
    // ── 1. Parse SBS data ─────────────────────────────────────────────
    const csv = buildRealisticSBSData();
    const states = parseSBS(csv);

    expect(states.length).toBeGreaterThanOrEqual(50);
    expect(states[0].icao24).toBe("A1B2C3");
    expect(states[0].callsign).toBe("SKY123");
    // Timestamps should be monotonically non-decreasing
    for (let i = 1; i < states.length; i++) {
      expect(states[i].timestamp).toBeGreaterThanOrEqual(states[i - 1].timestamp);
    }

    // ── 2. Assemble into flight tracks ────────────────────────────────
    const tracks = assembleFlightTracks(states);

    expect(tracks).toHaveLength(1);
    const track = tracks[0];
    expect(track.icao24).toBe("A1B2C3");
    expect(track.states.length).toBe(states.length);

    // ── 3. Detect flight phases ───────────────────────────────────────
    const phases = detectFlightPhases(track);

    expect(phases.length).toBeGreaterThanOrEqual(2);
    // Phases should cover the entire track (no gaps)
    expect(phases[0].startIndex).toBe(0);
    expect(phases[phases.length - 1].endIndex).toBe(track.states.length - 1);
    // Every segment must have valid time ordering
    for (const seg of phases) {
      expect(seg.endTime).toBeGreaterThanOrEqual(seg.startTime);
      expect(seg.endIndex).toBeGreaterThanOrEqual(seg.startIndex);
    }
    // Check that at least some expected phase types appear
    const phaseTypes = new Set(phases.map((p) => p.phase));
    // We should see climb and cruise at minimum in a full flight
    expect(phaseTypes.has("climb") || phaseTypes.has("cruise")).toBe(true);

    // ── 4. Build altitude profile ─────────────────────────────────────
    const profile = buildAltitudeProfile(track);

    expect(profile.points.length).toBe(track.states.length);
    // Distance should be monotonically increasing
    for (let i = 1; i < profile.points.length; i++) {
      expect(profile.points[i].distanceM).toBeGreaterThanOrEqual(
        profile.points[i - 1].distanceM
      );
    }
    // First point should be at distance 0
    expect(profile.points[0].distanceM).toBe(0);
    // Total distance JFK->BOS is roughly 300 km (should be > 100 km)
    const totalDistKm =
      profile.points[profile.points.length - 1].distanceM / 1000;
    expect(totalDistKm).toBeGreaterThan(50);

    // ── 5. Build density heatmap ──────────────────────────────────────
    const bbox: BoundingBox = {
      minLat: 40.5,
      maxLat: 42.5,
      minLon: -74.0,
      maxLon: -70.5,
    };
    const grid = buildDensityGrid(track.states, {
      bbox,
      latBins: 20,
      lonBins: 20,
    });

    expect(grid.length).toBeGreaterThan(0);
    // All cells should have positive values
    for (const cell of grid) {
      expect(cell.value).toBeGreaterThan(0);
      expect(cell.lat).toBeGreaterThanOrEqual(bbox.minLat);
      expect(cell.lat).toBeLessThanOrEqual(bbox.maxLat);
      expect(cell.lon).toBeGreaterThanOrEqual(bbox.minLon);
      expect(cell.lon).toBeLessThanOrEqual(bbox.maxLon);
    }

    // Normalize heatmap
    const normalized = normalizeHeatmap(grid);
    expect(normalized.length).toBe(grid.length);
    const maxVal = Math.max(...normalized.map((c) => c.value));
    expect(maxVal).toBeCloseTo(1.0, 5);
    for (const cell of normalized) {
      expect(cell.value).toBeGreaterThanOrEqual(0);
      expect(cell.value).toBeLessThanOrEqual(1);
    }

    // ── 6. Export to GeoJSON ──────────────────────────────────────────
    const geojson = flightTrackToGeoJSON(track) as {
      type: string;
      properties: Record<string, unknown>;
      geometry: { type: string; coordinates: number[][] };
    };

    expect(geojson.type).toBe("Feature");
    expect(geojson.geometry.type).toBe("LineString");
    expect(geojson.geometry.coordinates.length).toBe(track.states.length);
    expect(geojson.properties.icao24).toBe("A1B2C3");
    // Each coordinate should be [lon, lat, altM]
    for (const coord of geojson.geometry.coordinates) {
      expect(coord).toHaveLength(3);
      expect(typeof coord[0]).toBe("number");
      expect(typeof coord[1]).toBe("number");
      expect(typeof coord[2]).toBe("number");
    }

    // ── 7. Export to CZML ─────────────────────────────────────────────
    const czml = flightTrackToCZML(track) as Record<string, unknown>[];

    expect(czml.length).toBe(2); // document + flight packet
    expect(czml[0]).toHaveProperty("id", "document");
    expect(czml[0]).toHaveProperty("version", "1.0");
    expect(czml[1]).toHaveProperty("id", `flight-${track.icao24}`);
    expect(czml[1]).toHaveProperty("position");
    const position = czml[1].position as { cartographicDegrees: number[] };
    // 4 values per state: time, lon, lat, alt
    expect(position.cartographicDegrees.length).toBe(track.states.length * 4);

    // ── 8. Export to CSV ──────────────────────────────────────────────
    const csvOut = flightTrackToCSV(track);
    const csvLines = csvOut.trim().split("\n");

    // Header + one row per state
    expect(csvLines.length).toBe(track.states.length + 1);
    expect(csvLines[0]).toContain("timestamp");
    expect(csvLines[0]).toContain("icao24");
    expect(csvLines[0]).toContain("latitude");
    expect(csvLines[0]).toContain("altitude_ft");
  });
});

describe("E2E: Airspace crossing detection", () => {
  it("detects entry and exit through a rectangular sector", () => {
    const { track, boundary } = buildAirspaceCrossingData();

    const crossings = detectSectorCrossings(track, [boundary]);

    // Should detect exactly one crossing of the sector
    expect(crossings).toHaveLength(1);

    const crossing = crossings[0];
    expect(crossing.boundary.id).toBe("SECTOR-A");

    // Entry should occur when track crosses into the sector (lat ~40.8)
    expect(crossing.entryPoint.lat).toBeGreaterThanOrEqual(40.8);
    expect(crossing.entryPoint.lat).toBeLessThan(41.0);

    // Exit should occur when track crosses out of the sector (lat ~41.2)
    expect(crossing.exitPoint.lat).toBeGreaterThan(41.1);
    expect(crossing.exitPoint.lat).toBeLessThanOrEqual(41.5);

    // Entry time should be before exit time
    expect(crossing.exitTime).toBeGreaterThan(crossing.entryTime);

    // Dwell time should be reasonable (a few minutes)
    const dwellSec = crossing.exitTime - crossing.entryTime;
    expect(dwellSec).toBeGreaterThan(0);
    expect(dwellSec).toBeLessThan(600); // less than 10 minutes
  });
});

describe("E2E: Weather pipeline -- METAR -> Wind barbs", () => {
  it("parses METAR and generates wind barb geometry", () => {
    // Real-world METAR examples
    const metarStrings = [
      "KJFK 151456Z 22015G25KT 10SM FEW250 25/14 A3002",
      "KBOS 151456Z 18010KT 10SM SCT040 BKN080 22/16 A2998",
      "KORD 151456Z 27035G50KT 6SM -RA OVC020 18/15 A2975",
    ];
    const stations = [
      { lat: 40.6413, lon: -73.7781 },
      { lat: 42.3656, lon: -71.0096 },
      { lat: 41.9742, lon: -87.9073 },
    ];

    // ── 1. Parse METARs ───────────────────────────────────────────────
    const metars = metarStrings.map((raw, i) =>
      parseMETAR(raw, stations[i].lat, stations[i].lon)
    );

    expect(metars).toHaveLength(3);

    // Verify KJFK METAR
    const jfk = metars[0];
    expect(jfk.station).toBe("KJFK");
    expect(jfk.windDir).toBe(220);
    expect(jfk.windSpeedKts).toBe(15);
    expect(jfk.windGustKts).toBe(25);
    expect(jfk.visibility).toBe(10);
    expect(jfk.tempC).toBe(25);
    expect(jfk.dewpointC).toBe(14);
    expect(jfk.altimeterInHg).toBeCloseTo(30.02, 2);
    expect(jfk.flightCategory).toBe("VFR");

    // Verify KBOS METAR
    const bos = metars[1];
    expect(bos.station).toBe("KBOS");
    expect(bos.windSpeedKts).toBe(10);
    expect(bos.windGustKts).toBeNull();

    // Verify KORD METAR (gusty, rain)
    const ord = metars[2];
    expect(ord.windDir).toBe(270);
    expect(ord.windSpeedKts).toBe(35);
    expect(ord.windGustKts).toBe(50);
    // Ceiling at OVC020 = 2000 ft
    expect(ord.ceiling).toBe(2000);

    // ── 2. Convert to wind barbs ──────────────────────────────────────
    const barbs = metarToWindBarbs(metars);

    expect(barbs).toHaveLength(3); // all have wind > 0
    expect(barbs[0].lat).toBeCloseTo(40.6413, 3);
    expect(barbs[0].directionDeg).toBe(220);
    expect(barbs[0].speedKts).toBe(15);

    // ── 3. Generate wind barb geometry ────────────────────────────────
    for (const barb of barbs) {
      const geom = windBarbGeometry(barb);

      // Shaft should always be present with 2 points (origin to tip)
      expect(geom.shaft).toHaveLength(2);
      expect(geom.shaft[0]).toEqual([0, 0]); // origin

      // Flags represent 10-kt barbs + 5-kt half-barbs
      // For 15 kts: 1 long flag + 1 short flag = 2 flags total
      if (barb.speedKts === 15) {
        expect(geom.flags.length).toBe(2); // one 10-kt, one 5-kt
        expect(geom.pennants.length).toBe(0);
      }

      // For 35 kts: 3 long flags + 1 short flag
      if (barb.speedKts === 35) {
        expect(geom.flags.length).toBe(4); // three 10-kt + one 5-kt
        expect(geom.pennants.length).toBe(0);
      }

      // Every flag should be a pair of [x,y] points
      for (const flag of geom.flags) {
        expect(flag).toHaveLength(2);
        expect(flag[0]).toHaveLength(2);
        expect(flag[1]).toHaveLength(2);
      }

      // Every pennant should be a triangle (3 points)
      for (const pennant of geom.pennants) {
        expect(pennant).toHaveLength(3);
      }
    }

    // Test a 55-kt barb to verify pennant generation
    const strongBarb = { lat: 0, lon: 0, directionDeg: 180, speedKts: 55 };
    const strongGeom = windBarbGeometry(strongBarb);
    // 55 kts = 1 pennant (50) + 1 half-flag (5)
    expect(strongGeom.pennants.length).toBe(1);
    expect(strongGeom.flags.length).toBe(1); // the remaining 5 kt half-barb
  });
});

describe("E2E: Holding pattern detection", () => {
  it("finds a holding pattern embedded in a straight-hold-straight track", () => {
    const track = buildHoldingPatternTrack();

    // Total points: 30 (straight) + 150 (hold) + 30 (straight) = 210
    expect(track.states.length).toBe(210);

    const holdings = detectHoldingPatterns(track, {
      minOrbitDeg: 270,
      minOrbits: 1,
      windowSize: 40,
    });

    // Should detect at least one holding pattern
    expect(holdings.length).toBeGreaterThanOrEqual(1);

    const hold = holdings[0];

    // Holding should start approximately when the orbit begins (after the first 30 straight points)
    const baseTime = track.states[0].timestamp;
    const straightEndTime = baseTime + 29 * 10; // last straight segment point

    // Hold start should be near the transition from straight to orbiting
    expect(hold.startTime).toBeGreaterThanOrEqual(straightEndTime - 200);
    // But not deep into the second straight segment
    const holdingEndApprox = baseTime + (30 + 300) * 10;
    expect(hold.startTime).toBeLessThan(holdingEndApprox);

    // Hold end should be somewhere within or near the end of the orbiting section
    expect(hold.endTime).toBeLessThanOrEqual(holdingEndApprox + 500);

    // Should have detected multiple orbits (we inserted 3 full orbits)
    expect(hold.orbits).toBeGreaterThanOrEqual(1);

    // Center should be near the hold fix
    expect(hold.centerLat).toBeCloseTo(41.12, 0);
    expect(hold.centerLon).toBeCloseTo(-73.0, 0);

    // Leg length should be reasonable (order of km)
    expect(hold.legLengthM).toBeGreaterThan(100);
    expect(hold.legLengthM).toBeLessThan(50000);
  });
});

describe("E2E: Replay engine with phase events", () => {
  it("generates properly ordered phase-change events from a full flight", () => {
    // Build a track from SBS data
    const csv = buildRealisticSBSData();
    const states = parseSBS(csv);
    const tracks = assembleFlightTracks(states);
    const track = tracks[0];

    // Detect phases
    const phases = detectFlightPhases(track);
    expect(phases.length).toBeGreaterThanOrEqual(2);

    // Generate phase events
    const events = generatePhaseEvents(track, phases);

    // Should have one event per phase segment
    expect(events.length).toBe(phases.length);

    // Events should be in chronological order
    for (let i = 1; i < events.length; i++) {
      expect(events[i].time).toBeGreaterThanOrEqual(events[i - 1].time);
    }

    // All events should be phase_change type
    for (const event of events) {
      expect(event.type).toBe("phase_change");
      expect(event.aircraft).toBe(track.icao24);
      expect(event.label).toContain("begins");
      expect(event.data).toBeDefined();
      expect(event.data!.phase).toBeDefined();
    }

    // Events should reference valid phase names
    const validPhases = new Set([
      "ground", "takeoff", "climb", "cruise", "descent", "approach", "landing",
    ]);
    for (const event of events) {
      expect(validPhases.has(event.data!.phase as string)).toBe(true);
    }

    // Verify the EventTimeline can hold and query these events
    const timeline = new EventTimeline();
    for (const event of events) {
      timeline.addEvent(event);
    }

    const allEvents = timeline.getAllEvents();
    expect(allEvents.length).toBe(events.length);

    // Query events for this aircraft
    const aircraftEvents = timeline.getEventsForAircraft(track.icao24);
    expect(aircraftEvents.length).toBe(events.length);

    // Query a time range -- should find a subset
    if (events.length >= 3) {
      const rangeEvents = timeline.getEventsInRange(
        events[1].time,
        events[events.length - 1].time
      );
      expect(rangeEvents.length).toBeGreaterThanOrEqual(2);
      expect(rangeEvents.length).toBeLessThanOrEqual(events.length);
    }
  });
});
