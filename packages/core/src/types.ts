/** A single ADS-B state vector */
export interface StateVector {
  icao24: string;
  callsign: string | null;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  groundSpeedKts: number;
  trackDeg: number;
  verticalRateFpm: number;
  onGround: boolean;
}

/** A complete flight track */
export interface FlightTrack {
  icao24: string;
  callsign: string | null;
  origin: string | null;
  destination: string | null;
  states: StateVector[];
}

/** 3D position in world space */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/** Geographic bounding box */
export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Color in RGBA */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Heatmap cell */
export interface HeatmapCell {
  lat: number;
  lon: number;
  value: number;
}

/** Time range for replay */
export interface TimeRange {
  start: number;
  end: number;
}

/** Viewport camera state */
export interface CameraState {
  position: Position3D;
  target: Position3D;
  fov: number;
  zoom: number;
}

/** Airport reference point */
export interface Airport {
  icao: string;
  iata: string | null;
  name: string;
  latitude: number;
  longitude: number;
  elevationFt: number;
}

/** Map tile coordinate (slippy map) */
export interface TileCoord {
  x: number;
  y: number;
  z: number;
}

/** Flight phase classification */
export type FlightPhase =
  | "ground"
  | "takeoff"
  | "climb"
  | "cruise"
  | "descent"
  | "approach"
  | "landing";

/** A segment of a flight in a single phase */
export interface PhaseSegment {
  phase: FlightPhase;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
}

/** Event marker on a replay timeline */
export interface EventMarker {
  time: number;
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

/** Airspace sector boundary */
export interface AirspaceBoundary {
  id: string;
  name: string;
  type: string;
  polygon: { lat: number; lon: number }[];
  altRange?: { minFl: number; maxFl: number };
}

/** Navigation waypoint or fix */
export interface WaypointFix {
  name: string;
  lat: number;
  lon: number;
  type: "waypoint" | "vor" | "ndb" | "fix";
}

/** Hexagonal bin cell for hex-grid heatmaps */
export interface HexBinCell {
  centerLat: number;
  centerLon: number;
  radius: number;
  value: number;
}
