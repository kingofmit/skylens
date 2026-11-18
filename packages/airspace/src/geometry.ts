import { AirspaceBoundary } from "@skylens-aviation/core";

/** Ray-casting point-in-polygon test */
export function pointInPolygon(
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

/** Find all airspace sectors containing a given point (with altitude filtering) */
export function findContainingSectors(
  lat: number,
  lon: number,
  altFl: number,
  boundaries: AirspaceBoundary[],
): AirspaceBoundary[] {
  return boundaries.filter((b) => {
    if (!pointInPolygon(lat, lon, b.polygon)) return false;
    if (b.altRange) {
      if (altFl < b.altRange.minFl || altFl > b.altRange.maxFl) return false;
    }
    return true;
  });
}
