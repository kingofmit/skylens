import { Position3D } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6371000;

/** Convert lat/lon/alt to 3D Cartesian (meters, ENU from reference) */
export function geoToEnu(
  lat: number,
  lon: number,
  altM: number,
  refLat: number,
  refLon: number,
  refAltM: number = 0,
): Position3D {
  const dLat = (lat - refLat) * DEG_TO_RAD;
  const dLon = (lon - refLon) * DEG_TO_RAD;
  const cosRef = Math.cos(refLat * DEG_TO_RAD);
  return {
    x: dLon * EARTH_RADIUS_M * cosRef,
    y: dLat * EARTH_RADIUS_M,
    z: altM - refAltM,
  };
}

/** Convert ENU back to lat/lon/alt */
export function enuToGeo(
  pos: Position3D,
  refLat: number,
  refLon: number,
  refAltM: number = 0,
): { latitude: number; longitude: number; altitudeM: number } {
  const cosRef = Math.cos(refLat * DEG_TO_RAD);
  return {
    latitude: refLat + (pos.y / EARTH_RADIUS_M) / DEG_TO_RAD,
    longitude: refLon + (pos.x / (EARTH_RADIUS_M * cosRef)) / DEG_TO_RAD,
    altitudeM: pos.z + refAltM,
  };
}

/** Haversine distance between two points in meters */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Bearing from point 1 to point 2 in degrees */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
  return ((Math.atan2(y, x) / DEG_TO_RAD) + 360) % 360;
}

/** Convert feet to meters */
export function ftToM(ft: number): number {
  return ft * 0.3048;
}

/** Convert meters to feet */
export function mToFt(m: number): number {
  return m / 0.3048;
}

/** Convert knots to m/s */
export function ktsToMs(kts: number): number {
  return kts * 0.514444;
}

/* ── Great-circle interpolation ───────────────────────────────────── */

/** Interpolate along a great-circle arc between two points */
export function greatCircleInterpolate(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number,
): { lat: number; lon: number } {
  const φ1 = lat1 * DEG_TO_RAD;
  const λ1 = lon1 * DEG_TO_RAD;
  const φ2 = lat2 * DEG_TO_RAD;
  const λ2 = lon2 * DEG_TO_RAD;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
    ),
  );

  if (d < 1e-12) return { lat: lat1, lon: lon1 };

  const a = Math.sin((1 - fraction) * d) / Math.sin(d);
  const b = Math.sin(fraction * d) / Math.sin(d);

  const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
  const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
  const z = a * Math.sin(φ1) + b * Math.sin(φ2);

  return {
    lat: Math.atan2(z, Math.sqrt(x * x + y * y)) / DEG_TO_RAD,
    lon: Math.atan2(y, x) / DEG_TO_RAD,
  };
}

/** Generate an array of points along a great-circle arc */
export function greatCircleArc(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints: number,
): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    points.push(greatCircleInterpolate(lat1, lon1, lat2, lon2, i / (numPoints - 1)));
  }
  return points;
}

/* ── Mercator / Web Mercator projections ──────────────────────────── */

/** Project lat/lon to Mercator (EPSG:3857) coordinates in meters */
export function toMercator(
  lat: number,
  lon: number,
): { x: number; y: number } {
  const x = lon * DEG_TO_RAD * EARTH_RADIUS_M;
  const y =
    Math.log(Math.tan(Math.PI / 4 + (lat * DEG_TO_RAD) / 2)) * EARTH_RADIUS_M;
  return { x, y };
}

/** Inverse Mercator — meters back to lat/lon */
export function fromMercator(
  x: number,
  y: number,
): { lat: number; lon: number } {
  const lon = (x / EARTH_RADIUS_M) / DEG_TO_RAD;
  const lat =
    (2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) / DEG_TO_RAD;
  return { lat, lon };
}

const WEB_MERCATOR_MAX_LAT = 85.051129;

/** Project lat/lon to Web Mercator (clamps latitude to ±85.051°) */
export function toWebMercator(
  lat: number,
  lon: number,
): { x: number; y: number } {
  const clampedLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
  return toMercator(clampedLat, lon);
}

/** Inverse Web Mercator — meters back to lat/lon */
export function fromWebMercator(
  x: number,
  y: number,
): { lat: number; lon: number } {
  return fromMercator(x, y);
}
