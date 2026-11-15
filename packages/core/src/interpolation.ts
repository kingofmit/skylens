import { StateVector } from "./types";

/** Linear interpolation between two state vectors at a given timestamp */
export function interpolateState(
  a: StateVector,
  b: StateVector,
  timestamp: number,
): StateVector {
  if (b.timestamp === a.timestamp) return { ...a };
  const t = (timestamp - a.timestamp) / (b.timestamp - a.timestamp);
  const clamp = Math.max(0, Math.min(1, t));
  return {
    icao24: a.icao24,
    callsign: a.callsign ?? b.callsign,
    timestamp,
    latitude: a.latitude + (b.latitude - a.latitude) * clamp,
    longitude: a.longitude + (b.longitude - a.longitude) * clamp,
    altitudeFt: a.altitudeFt + (b.altitudeFt - a.altitudeFt) * clamp,
    groundSpeedKts: a.groundSpeedKts + (b.groundSpeedKts - a.groundSpeedKts) * clamp,
    trackDeg: interpolateAngle(a.trackDeg, b.trackDeg, clamp),
    verticalRateFpm: a.verticalRateFpm + (b.verticalRateFpm - a.verticalRateFpm) * clamp,
    onGround: clamp < 0.5 ? a.onGround : b.onGround,
  };
}

/** Interpolate angle (handles wraparound at 360°) */
function interpolateAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((a + diff * t) + 360) % 360;
}

/** Catmull-Rom spline interpolation for smoother path rendering */
export function catmullRomInterpolate(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}
