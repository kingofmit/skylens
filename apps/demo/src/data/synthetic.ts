import type {
  StateVector,
  FlightTrack,
  AirspaceBoundary,
  WaypointFix,
  FlightDNAMetrics,
  BoundingBox,
} from "@skylens/core";
import { greatCircleInterpolate, bearing } from "@skylens/core";
import type { RunwayDefinition } from "@skylens/airport";

/* ================================================================== *
 *  Public interface                                                    *
 * ================================================================== */

export interface SyntheticData {
  tracks: FlightTrack[];
  surfaceTracks: FlightTrack[];
  airspaceBoundaries: AirspaceBoundary[];
  metarStrings: string[];
  tafStrings: string[];
  sigmetGeoJSON: object;
  pirepStrings: string[];
  waypointFixes: WaypointFix[];
  flightDNAMetrics: FlightDNAMetrics[];
  congestionRegions: BoundingBox[];
  airport: {
    center: { lat: number; lon: number };
    runways: RunwayDefinition[];
    gates: { name: string; lat: number; lon: number }[];
  };
}

/* ================================================================== *
 *  Constants                                                          *
 * ================================================================== */

const BASE_TS = 1700000000;
const DT = 30; // seconds between state vectors

const JFK = { lat: 40.6413, lon: -73.7781 };
const LAX = { lat: 33.9425, lon: -118.4081 };
const LHR = { lat: 51.47, lon: -0.4543 };
const CDG = { lat: 49.0097, lon: 2.5479 };
const SFO = { lat: 37.6213, lon: -122.379 };
const SEA = { lat: 47.4502, lon: -122.3088 };

const JFK_RUNWAYS: RunwayDefinition[] = [
  { name: "31L", thresholdLat: 40.6395, thresholdLon: -73.7627, headingDeg: 310, lengthM: 3048 },
  { name: "4R", thresholdLat: 40.628, thresholdLon: -73.77, headingDeg: 40, lengthM: 2560 },
];

const JFK_GATES: { name: string; lat: number; lon: number }[] = [
  { name: "G1", lat: 40.645, lon: -73.783 },
  { name: "G2", lat: 40.6445, lon: -73.782 },
  { name: "G3", lat: 40.644, lon: -73.781 },
  { name: "G4", lat: 40.6435, lon: -73.78 },
];

/* ================================================================== *
 *  Helpers                                                            *
 * ================================================================== */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Build one state vector. */
function sv(
  icao24: string,
  callsign: string,
  ts: number,
  lat: number,
  lon: number,
  altFt: number,
  gsKts: number,
  trkDeg: number,
  vrFpm: number,
  onGround: boolean,
): StateVector {
  return {
    icao24,
    callsign,
    timestamp: ts,
    latitude: lat,
    longitude: lon,
    altitudeFt: altFt,
    groundSpeedKts: gsKts,
    trackDeg: trkDeg,
    verticalRateFpm: vrFpm,
    onGround,
  };
}

/* ================================================================== *
 *  Flight generation helpers                                          *
 * ================================================================== */

interface PhaseSpec {
  count: number;
  altStart: number;
  altEnd: number;
  spdStart: number;
  spdEnd: number;
  vrStart: number;
  vrEnd: number;
  onGround: boolean;
  /** Override fraction range for GC interpolation [startFrac, endFrac] */
  fracRange?: [number, number];
}

function generateFlightStates(
  icao24: string,
  callsign: string,
  origin: { lat: number; lon: number },
  dest: { lat: number; lon: number },
  phases: PhaseSpec[],
  startTs: number,
): StateVector[] {
  const totalStates = phases.reduce((s, p) => s + p.count, 0);
  const states: StateVector[] = [];
  let idx = 0;

  for (const phase of phases) {
    const fracStart = phase.fracRange ? phase.fracRange[0] : idx / totalStates;
    const fracEnd = phase.fracRange ? phase.fracRange[1] : (idx + phase.count) / totalStates;

    for (let i = 0; i < phase.count; i++) {
      const t = phase.count > 1 ? i / (phase.count - 1) : 0;
      const frac = lerp(fracStart, fracEnd, t);
      const pos = greatCircleInterpolate(origin.lat, origin.lon, dest.lat, dest.lon, frac);
      const alt = lerp(phase.altStart, phase.altEnd, t);
      const spd = lerp(phase.spdStart, phase.spdEnd, t);
      const vr = lerp(phase.vrStart, phase.vrEnd, t);
      const trk = bearing(origin.lat, origin.lon, dest.lat, dest.lon);
      states.push(sv(icao24, callsign, startTs + (idx + i) * DT, pos.lat, pos.lon, alt, spd, trk, vr, phase.onGround));
    }
    idx += phase.count;
  }
  return states;
}

/* ================================================================== *
 *  Holding pattern insertion                                          *
 * ================================================================== */

function insertHoldingPattern(states: StateVector[], insertIndex: number, orbits: number): StateVector[] {
  const ref = states[insertIndex];
  const holdStates: StateVector[] = [];
  const statesPerOrbit = 36; // 10° per state
  const total = orbits * statesPerOrbit;
  const radius = 0.03; // degrees offset for orbit

  for (let i = 0; i < total; i++) {
    const angle = (i * 10) % 360;
    const rad = (angle * Math.PI) / 180;
    holdStates.push(
      sv(
        ref.icao24,
        ref.callsign ?? "",
        ref.timestamp + (i + 1) * DT,
        ref.latitude + radius * Math.sin(rad),
        ref.longitude + radius * Math.cos(rad),
        ref.altitudeFt,
        ref.groundSpeedKts,
        angle,
        0,
        false,
      ),
    );
  }

  // Adjust timestamps of everything after the insertion
  const timeBump = total * DT;
  const after = states.slice(insertIndex + 1).map((s) => ({
    ...s,
    timestamp: s.timestamp + timeBump,
  }));

  return [...states.slice(0, insertIndex + 1), ...holdStates, ...after];
}

/* ================================================================== *
 *  En-route flight builders                                           *
 * ================================================================== */

function buildJfkToLax(): FlightTrack {
  const phases: PhaseSpec[] = [
    { count: 5, altStart: 0, altEnd: 0, spdStart: 0, spdEnd: 20, vrStart: 0, vrEnd: 0, onGround: true },
    { count: 5, altStart: 0, altEnd: 2000, spdStart: 20, spdEnd: 150, vrStart: 0, vrEnd: 2000, onGround: false },
    { count: 20, altStart: 2000, altEnd: 35000, spdStart: 150, spdEnd: 450, vrStart: 2000, vrEnd: 2000, onGround: false },
    { count: 50, altStart: 35000, altEnd: 35000, spdStart: 450, spdEnd: 450, vrStart: 0, vrEnd: 0, onGround: false },
    { count: 20, altStart: 35000, altEnd: 3000, spdStart: 450, spdEnd: 200, vrStart: -1500, vrEnd: -1500, onGround: false },
    { count: 10, altStart: 3000, altEnd: 200, spdStart: 200, spdEnd: 140, vrStart: -1500, vrEnd: -800, onGround: false },
    { count: 10, altStart: 200, altEnd: 0, spdStart: 140, spdEnd: 20, vrStart: -800, vrEnd: 0, onGround: false },
  ];

  let states = generateFlightStates("a00001", "AAL100", JFK, LAX, phases, BASE_TS);
  // Last 10 states should be on-ground for landing
  for (let i = states.length - 10; i < states.length; i++) {
    states[i] = { ...states[i], onGround: true };
  }

  // Insert holding pattern near state index 90
  states = insertHoldingPattern(states, 90, 2);

  return { icao24: "a00001", callsign: "AAL100", origin: "KJFK", destination: "KLAX", states };
}

function buildLhrToCdg(): FlightTrack {
  const phases: PhaseSpec[] = [
    { count: 5, altStart: 0, altEnd: 0, spdStart: 0, spdEnd: 20, vrStart: 0, vrEnd: 0, onGround: true },
    { count: 5, altStart: 0, altEnd: 2000, spdStart: 20, spdEnd: 150, vrStart: 0, vrEnd: 2000, onGround: false },
    { count: 15, altStart: 2000, altEnd: 35000, spdStart: 150, spdEnd: 450, vrStart: 2000, vrEnd: 2000, onGround: false },
    { count: 20, altStart: 35000, altEnd: 35000, spdStart: 450, spdEnd: 450, vrStart: 0, vrEnd: 0, onGround: false },
    { count: 15, altStart: 35000, altEnd: 3000, spdStart: 450, spdEnd: 200, vrStart: -1500, vrEnd: -1500, onGround: false },
    { count: 10, altStart: 3000, altEnd: 200, spdStart: 200, spdEnd: 140, vrStart: -1500, vrEnd: -800, onGround: false },
    { count: 10, altStart: 200, altEnd: 0, spdStart: 140, spdEnd: 20, vrStart: -800, vrEnd: 0, onGround: false },
  ];

  const states = generateFlightStates("400001", "BAW304", LHR, CDG, phases, BASE_TS);
  for (let i = states.length - 10; i < states.length; i++) {
    states[i] = { ...states[i], onGround: true };
  }

  return { icao24: "400001", callsign: "BAW304", origin: "EGLL", destination: "LFPG", states };
}

function buildSfoToSea(): FlightTrack {
  const phases: PhaseSpec[] = [
    { count: 5, altStart: 0, altEnd: 0, spdStart: 0, spdEnd: 20, vrStart: 0, vrEnd: 0, onGround: true },
    { count: 5, altStart: 0, altEnd: 2000, spdStart: 20, spdEnd: 150, vrStart: 0, vrEnd: 2000, onGround: false },
    { count: 15, altStart: 2000, altEnd: 37000, spdStart: 150, spdEnd: 460, vrStart: 2000, vrEnd: 2000, onGround: false },
    { count: 20, altStart: 37000, altEnd: 37000, spdStart: 460, spdEnd: 460, vrStart: 0, vrEnd: 0, onGround: false },
    { count: 15, altStart: 37000, altEnd: 3000, spdStart: 460, spdEnd: 200, vrStart: -1500, vrEnd: -1500, onGround: false },
    { count: 10, altStart: 3000, altEnd: 200, spdStart: 200, spdEnd: 140, vrStart: -1500, vrEnd: -800, onGround: false },
    { count: 10, altStart: 200, altEnd: 0, spdStart: 140, spdEnd: 20, vrStart: -800, vrEnd: 0, onGround: false },
  ];

  const states = generateFlightStates("a00003", "UAL1234", SFO, SEA, phases, BASE_TS);
  for (let i = states.length - 10; i < states.length; i++) {
    states[i] = { ...states[i], onGround: true };
  }

  return { icao24: "a00003", callsign: "UAL1234", origin: "KSFO", destination: "KSEA", states };
}

/* ================================================================== *
 *  Surface (airport ground) tracks                                    *
 * ================================================================== */

function buildSurfaceTracks(): FlightTrack[] {
  const tracks: FlightTrack[] = [];

  const configs: {
    icao24: string;
    callsign: string;
    gate: { lat: number; lon: number };
    runway: RunwayDefinition;
  }[] = [
    { icao24: "a10001", callsign: "DAL401", gate: JFK_GATES[0], runway: JFK_RUNWAYS[0] },
    { icao24: "a10002", callsign: "UAL502", gate: JFK_GATES[1], runway: JFK_RUNWAYS[0] },
    { icao24: "a10003", callsign: "AAL603", gate: JFK_GATES[2], runway: JFK_RUNWAYS[1] },
    { icao24: "a10004", callsign: "JBU704", gate: JFK_GATES[3], runway: JFK_RUNWAYS[1] },
    { icao24: "a10005", callsign: "DAL805", gate: JFK_GATES[0], runway: JFK_RUNWAYS[0] },
  ];

  for (let ci = 0; ci < configs.length; ci++) {
    const { icao24, callsign, gate, runway } = configs[ci];
    const states: StateVector[] = [];
    const startTs = BASE_TS + ci * 600; // stagger 10 min apart

    // Phase 1: gate stop (8 states, near-zero speed)
    for (let i = 0; i < 8; i++) {
      states.push(
        sv(icao24, callsign, startTs + i * DT, gate.lat, gate.lon, 0, lerp(0, 2, i / 7), runway.headingDeg, 0, true),
      );
    }

    // Phase 2: taxi from gate to runway (12 states, interpolate position)
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const lat = lerp(gate.lat, runway.thresholdLat, t);
      const lon = lerp(gate.lon, runway.thresholdLon, t);
      const taxiHeading = bearing(gate.lat, gate.lon, runway.thresholdLat, runway.thresholdLon);
      states.push(
        sv(icao24, callsign, startTs + (8 + i) * DT, lat, lon, 0, lerp(10, 25, Math.sin(t * Math.PI)), taxiHeading, 0, true),
      );
    }

    // Phase 3: runway roll (10 states, accelerate then decelerate)
    const rwyEndLat = runway.thresholdLat + (runway.lengthM / 111320) * Math.cos((runway.headingDeg * Math.PI) / 180);
    const rwyEndLon =
      runway.thresholdLon +
      (runway.lengthM / (111320 * Math.cos((runway.thresholdLat * Math.PI) / 180))) *
        Math.sin((runway.headingDeg * Math.PI) / 180);

    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const lat = lerp(runway.thresholdLat, rwyEndLat, t);
      const lon = lerp(runway.thresholdLon, rwyEndLon, t);
      const speed = lerp(60, 150, t);
      states.push(
        sv(icao24, callsign, startTs + (20 + i) * DT, lat, lon, 0, speed, runway.headingDeg, 0, true),
      );
    }

    tracks.push({ icao24, callsign, origin: "KJFK", destination: null, states });
  }

  return tracks;
}

/* ================================================================== *
 *  Airspace boundaries                                                *
 * ================================================================== */

function buildAirspaceBoundaries(): AirspaceBoundary[] {
  return [
    {
      id: "ZNY",
      name: "New York ARTCC",
      type: "ARTCC",
      polygon: [
        { lat: 42, lon: -75 },
        { lat: 42, lon: -71 },
        { lat: 39, lon: -71 },
        { lat: 39, lon: -75 },
      ],
      altRange: { minFl: 0, maxFl: 600 },
    },
    {
      id: "ZBW",
      name: "Boston ARTCC",
      type: "ARTCC",
      polygon: [
        { lat: 45, lon: -74 },
        { lat: 45, lon: -69 },
        { lat: 42, lon: -69 },
        { lat: 42, lon: -74 },
      ],
      altRange: { minFl: 0, maxFl: 600 },
    },
    {
      id: "ZDC",
      name: "Washington ARTCC",
      type: "ARTCC",
      polygon: [
        { lat: 39, lon: -79 },
        { lat: 39, lon: -75 },
        { lat: 36, lon: -75 },
        { lat: 36, lon: -79 },
      ],
      altRange: { minFl: 0, maxFl: 600 },
    },
  ];
}

/* ================================================================== *
 *  Weather strings                                                    *
 * ================================================================== */

const METAR_STRINGS = [
  "METAR KJFK 151756Z 31015G25KT 10SM FEW250 M04/M18 A3038 RMK AO2",
  "METAR KLAX 151753Z 25010KT 10SM CLR 15/08 A3012 RMK AO2",
  "METAR KORD 151751Z 36020G30KT 3SM -SN OVC015 M08/M12 A2985 RMK AO2",
  "METAR KSFO 151756Z VRB03KT 10SM FEW020 12/09 A3022 RMK AO2",
  "METAR EGLL 151750Z 27012KT 9999 SCT040 08/02 Q1025 NOSIG",
  "METAR LFPG 151730Z 18008KT 9999 BKN035 10/05 Q1023 NOSIG",
];

const TAF_STRINGS = [
  "TAF KJFK 151730Z 1518/1624 31015G25KT P6SM FEW250 FM152200 33012KT P6SM SKC",
  "TAF KORD 151730Z 1518/1624 36020G30KT 3SM -SN OVC015 TEMPO 1518/1522 1SM SN OVC008",
];

const SIGMET_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "SIGMET-1",
        type: "SIGMET",
        hazard: "SEV TURB",
        minFl: 250,
        maxFl: 450,
        validFrom: 1700000000,
        validTo: 1700010000,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-92, 42],
            [-85, 42],
            [-85, 38],
            [-92, 38],
            [-92, 42],
          ],
        ],
      },
    },
  ],
};

const PIREP_STRINGS = [
  "UA /OV JFK090030/TM 1756/FL350/TP B738/TB MOD/RM CONTINUOUS",
  "UA /OV ORD180020/TM 1751/FL280/TP A320/TB SEV/IC LGT",
  "UA /OV LAX270050/TM 1753/FL390/TP B77W/TB LGT",
  "UA /OV SFO350015/TM 1756/FL250/TP E75L/IC MOD/RM MIXED ICING",
];

/* ================================================================== *
 *  Waypoint fixes                                                     *
 * ================================================================== */

const WAYPOINT_FIXES: WaypointFix[] = [
  { name: "MERIT", lat: 40.5, lon: -74.2, type: "fix" },
  { name: "GREKI", lat: 40.3, lon: -75.5, type: "fix" },
  { name: "GRACO", lat: 40.0, lon: -78.0, type: "fix" },
  { name: "GRIFY", lat: 39.5, lon: -81.0, type: "fix" },
  { name: "GREER", lat: 38.8, lon: -84.0, type: "vor" },
  { name: "BRDON", lat: 37.8, lon: -88.0, type: "fix" },
  { name: "TURKS", lat: 36.8, lon: -93.0, type: "fix" },
  { name: "AMRLO", lat: 35.5, lon: -100.0, type: "fix" },
  { name: "CLARR", lat: 34.8, lon: -108.0, type: "fix" },
  { name: "BASET", lat: 34.1, lon: -115.0, type: "fix" },
];

/* ================================================================== *
 *  FlightDNA metrics                                                  *
 * ================================================================== */

function buildFlightDNAMetrics(track: FlightTrack): FlightDNAMetrics[] {
  const metrics: FlightDNAMetrics[] = [];
  const total = track.states.length;
  const step = Math.max(1, Math.floor(total / 20));

  for (let i = 0; i < total; i += step) {
    const st = track.states[i];
    const progress = i / total; // 0..1

    // Health degrades toward mid-flight then recovers
    let healthScore: number;
    if (progress < 0.5) {
      healthScore = lerp(0.95, 0.3, progress / 0.5);
    } else {
      healthScore = lerp(0.3, 0.7, (progress - 0.5) / 0.5);
    }

    // Anomaly flags
    let anomalyFlags: string[] = [];
    if (progress > 0.25 && progress < 0.75) {
      anomalyFlags = ["ENG_TEMP_HIGH"];
    }
    if (progress > 0.4 && progress < 0.6) {
      anomalyFlags = ["ENG_TEMP_HIGH", "FUEL_FLOW_ANOMALY"];
    }

    // EGT performance envelope: goes out of range mid-flight
    const egtNominal = 850;
    const egtMin = 750;
    const egtMax = 950;
    let egtValue: number;
    if (progress < 0.3) {
      egtValue = lerp(820, 940, progress / 0.3);
    } else if (progress < 0.6) {
      egtValue = lerp(940, 1020, (progress - 0.3) / 0.3); // exceeds max
    } else {
      egtValue = lerp(1020, 870, (progress - 0.6) / 0.4);
    }

    metrics.push({
      icao24: track.icao24,
      timestamp: st.timestamp,
      healthScore,
      anomalyFlags,
      performanceEnvelope: [
        { param: "EGT", value: Math.round(egtValue), min: egtMin, max: egtMax },
        { param: "N1", value: Math.round(lerp(92, 88, Math.abs(progress - 0.5) * 2)), min: 60, max: 100 },
      ],
    });
  }

  return metrics;
}

/* ================================================================== *
 *  Congestion regions                                                 *
 * ================================================================== */

const CONGESTION_REGIONS: BoundingBox[] = [
  { minLat: 40, maxLat: 42, minLon: -75, maxLon: -72 },
  { minLat: 41, maxLat: 43, minLon: -89, maxLon: -86 },
  { minLat: 33, maxLat: 35, minLon: -119, maxLon: -117 },
];

/* ================================================================== *
 *  Main generator                                                     *
 * ================================================================== */

export function generateSyntheticData(): SyntheticData {
  const jfkToLax = buildJfkToLax();
  const lhrToCdg = buildLhrToCdg();
  const sfoToSea = buildSfoToSea();

  return {
    tracks: [jfkToLax, lhrToCdg, sfoToSea],
    surfaceTracks: buildSurfaceTracks(),
    airspaceBoundaries: buildAirspaceBoundaries(),
    metarStrings: METAR_STRINGS,
    tafStrings: TAF_STRINGS,
    sigmetGeoJSON: SIGMET_GEOJSON,
    pirepStrings: PIREP_STRINGS,
    waypointFixes: WAYPOINT_FIXES,
    flightDNAMetrics: buildFlightDNAMetrics(jfkToLax),
    congestionRegions: CONGESTION_REGIONS,
    airport: {
      center: JFK,
      runways: JFK_RUNWAYS,
      gates: JFK_GATES,
    },
  };
}
