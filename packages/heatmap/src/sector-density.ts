import { StateVector, AirspaceBoundary } from "@skylens/core";

/** Compute aircraft density per airspace sector using point-in-polygon */
export function sectorDensity(
  states: StateVector[],
  boundaries: AirspaceBoundary[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const boundary of boundaries) {
    counts.set(boundary.id, 0);
  }

  for (const s of states) {
    const altFl = s.altitudeFt / 100;
    for (const boundary of boundaries) {
      if (boundary.altRange) {
        if (altFl < boundary.altRange.minFl || altFl > boundary.altRange.maxFl) continue;
      }
      if (pointInPolygonInline(s.latitude, s.longitude, boundary.polygon)) {
        counts.set(boundary.id, (counts.get(boundary.id) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/** Inlined point-in-polygon to avoid circular dependency with @skylens/airspace */
function pointInPolygonInline(
  lat: number,
  lon: number,
  polygon: { lat: number; lon: number }[],
): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lon;
    const yj = polygon[j].lat;
    const xj = polygon[j].lon;
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
