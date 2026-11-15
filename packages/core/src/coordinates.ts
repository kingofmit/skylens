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
