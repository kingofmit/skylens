import { FlightTrack } from "@skylens-aviation/core";
import { haversineDistance } from "@skylens-aviation/core";

/** A point in an altitude profile (side-view 2D chart) */
export interface AltitudeProfilePoint {
  distanceM: number;
  altitudeFt: number;
  time: number;
}

/** Altitude profile data for 2D side-view visualization */
export interface AltitudeProfile {
  points: AltitudeProfilePoint[];
}

/** Build an altitude profile from a flight track (cumulative ground distance vs altitude) */
export function buildAltitudeProfile(track: FlightTrack): AltitudeProfile {
  const { states } = track;
  if (states.length === 0) return { points: [] };

  const points: AltitudeProfilePoint[] = [
    { distanceM: 0, altitudeFt: states[0].altitudeFt, time: states[0].timestamp },
  ];

  let cumulativeDistance = 0;
  for (let i = 1; i < states.length; i++) {
    cumulativeDistance += haversineDistance(
      states[i - 1].latitude,
      states[i - 1].longitude,
      states[i].latitude,
      states[i].longitude,
    );
    points.push({
      distanceM: cumulativeDistance,
      altitudeFt: states[i].altitudeFt,
      time: states[i].timestamp,
    });
  }

  return { points };
}
