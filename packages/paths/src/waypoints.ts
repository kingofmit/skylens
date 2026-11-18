import { FlightTrack, WaypointFix } from "@skylens/core";
import { haversineDistance } from "@skylens/core";

/** A waypoint annotation matched to a flight track point */
export interface WaypointAnnotation {
  fix: WaypointFix;
  stateIndex: number;
  distanceM: number;
}

/** Annotate a flight track with nearby waypoints/fixes */
export function annotateWaypoints(
  track: FlightTrack,
  fixes: WaypointFix[],
  thresholdM: number = 5000,
): WaypointAnnotation[] {
  const annotations: WaypointAnnotation[] = [];

  for (const fix of fixes) {
    let bestIndex = -1;
    let bestDist = Infinity;

    for (let i = 0; i < track.states.length; i++) {
      const dist = haversineDistance(
        track.states[i].latitude,
        track.states[i].longitude,
        fix.lat,
        fix.lon,
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    if (bestIndex >= 0 && bestDist <= thresholdM) {
      annotations.push({
        fix,
        stateIndex: bestIndex,
        distanceM: bestDist,
      });
    }
  }

  annotations.sort((a, b) => a.stateIndex - b.stateIndex);
  return annotations;
}
