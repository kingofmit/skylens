import type { AirspaceBoundary } from "@skylens-aviation/core";
import { airspaceBoundariesToGeoJSON } from "@skylens-aviation/airspace";

/**
 * Wraps airspaceBoundariesToGeoJSON — returns a GeoJSON FeatureCollection
 * of airspace polygons ready for map rendering.
 */
export function getAirspaceGeoJSON(
  boundaries: AirspaceBoundary[],
): GeoJSON.FeatureCollection {
  return airspaceBoundariesToGeoJSON(boundaries) as GeoJSON.FeatureCollection;
}
