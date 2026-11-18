import { AirspaceBoundary } from "@skylens-aviation/core";

/** Load airspace boundaries from a GeoJSON FeatureCollection */
export function loadAirspaceGeoJSON(geojson: {
  type: string;
  features?: { type: string; properties?: Record<string, unknown>; geometry?: { type: string; coordinates?: unknown } }[];
}): AirspaceBoundary[] {
  if (geojson.type !== "FeatureCollection" || !geojson.features) return [];

  const boundaries: AirspaceBoundary[] = [];

  for (const feature of geojson.features) {
    if (!feature.geometry || feature.geometry.type !== "Polygon") continue;

    const coords = (feature.geometry.coordinates as number[][][])?.[0];
    if (!coords || coords.length < 3) continue;

    const props = feature.properties ?? {};
    const polygon = coords.map(([lon, lat]) => ({ lat, lon }));

    const minFl = parseFloat(String(props.lower_limit ?? props.minFl ?? ""));
    const maxFl = parseFloat(String(props.upper_limit ?? props.maxFl ?? ""));

    boundaries.push({
      id: String(props.id ?? props.identifier ?? props.name ?? `sector-${boundaries.length}`),
      name: String(props.name ?? props.designator ?? props.id ?? "Unknown"),
      type: String(props.type ?? props.airspace_class ?? props.icaoClass ?? "OTHER"),
      polygon,
      altRange: !isNaN(minFl) && !isNaN(maxFl) ? { minFl, maxFl } : undefined,
    });
  }

  return boundaries;
}

/** Filter airspace boundaries by type */
export function filterByType(
  boundaries: AirspaceBoundary[],
  types: string[],
): AirspaceBoundary[] {
  const typeSet = new Set(types.map((t) => t.toUpperCase()));
  return boundaries.filter((b) => typeSet.has(b.type.toUpperCase()));
}
