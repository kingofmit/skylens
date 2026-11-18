/** Parsed SIGMET/AIRMET */
export interface SIGMET {
  id: string;
  type: "SIGMET" | "AIRMET";
  hazard: string;
  polygon: { lat: number; lon: number }[];
  altRange: { minFl: number; maxFl: number };
  validFrom: number;
  validTo: number;
}

/** Parse SIGMET/AIRMET data from GeoJSON (e.g., AWC GeoJSON feed) */
export function parseSIGMET_GeoJSON(geojson: {
  type: string;
  features?: {
    type: string;
    properties?: Record<string, unknown>;
    geometry?: { type: string; coordinates?: unknown };
  }[];
}): SIGMET[] {
  if (geojson.type !== "FeatureCollection" || !geojson.features) return [];

  const sigmets: SIGMET[] = [];

  for (const feature of geojson.features) {
    if (!feature.geometry) continue;
    const props = feature.properties ?? {};
    const geom = feature.geometry;

    let polygon: { lat: number; lon: number }[] = [];
    if (geom.type === "Polygon") {
      const coords = (geom.coordinates as number[][][])?.[0];
      if (coords) polygon = coords.map(([lon, lat]) => ({ lat, lon }));
    }

    if (polygon.length < 3) continue;

    const rawType = String(props.airSigmetType ?? props.type ?? "SIGMET").toUpperCase();
    const type: "SIGMET" | "AIRMET" = rawType.includes("AIRMET") ? "AIRMET" : "SIGMET";

    sigmets.push({
      id: String(props.airSigmetId ?? props.id ?? `sigmet-${sigmets.length}`),
      type,
      hazard: String(props.hazard ?? props.phenomenon ?? "UNKNOWN"),
      polygon,
      altRange: {
        minFl: Number(props.altitudeLow ?? props.minFl ?? 0),
        maxFl: Number(props.altitudeHi ?? props.maxFl ?? 600),
      },
      validFrom: Number(props.validTimeFrom ?? 0),
      validTo: Number(props.validTimeTo ?? 0),
    });
  }

  return sigmets;
}
