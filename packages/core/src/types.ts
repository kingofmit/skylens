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
