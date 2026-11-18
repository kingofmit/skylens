import { parseMETAR } from "@skylens/weather";
import type { METAR } from "@skylens/weather";
import { metarToWindBarbs } from "@skylens/weather";
import { parseSIGMET_GeoJSON } from "@skylens/weather";
import { parsePIREP } from "@skylens/weather";
import type { TurbulenceIntensity } from "@skylens/weather";

const TURB_COLORS: Record<string, string> = {
  NEG: "#10b981",
  LGT: "#3b82f6",
  MOD: "#f59e0b",
  SEV: "#ef4444",
  EXTRM: "#dc2626",
};

/**
 * Build GeoJSON layers for weather visualization:
 * - Wind barb positions from METARs
 * - SIGMET polygons
 * - PIREP point markers
 */
export function getWeatherGeoJSON(
  metarStrings: string[],
  sigmetGeoJSON: object,
  pirepStrings: string[],
): {
  windBarbs: GeoJSON.FeatureCollection;
  sigmets: GeoJSON.FeatureCollection;
  pireps: GeoJSON.FeatureCollection;
} {
  // --- Wind barbs from METARs ---
  const metars: METAR[] = metarStrings.map((raw) => {
    // Extract station code for approximate lat/lon
    const station = raw.trim().split(/\s+/)[1] ?? "";
    const coords = STATION_COORDS[station] ?? { lat: 0, lon: 0 };
    return parseMETAR(raw, coords.lat, coords.lon);
  });

  const barbs = metarToWindBarbs(metars);
  const windBarbFeatures: GeoJSON.Feature[] = barbs.map((b) => ({
    type: "Feature",
    properties: {
      type: "wind_barb",
      speedKts: b.speedKts,
      directionDeg: b.directionDeg,
      label: `${b.speedKts}kt @ ${b.directionDeg}°`,
    },
    geometry: { type: "Point", coordinates: [b.lon, b.lat] },
  }));

  // Also add METAR station markers with flight category
  for (const m of metars) {
    windBarbFeatures.push({
      type: "Feature",
      properties: {
        type: "metar_station",
        station: m.station,
        category: m.flightCategory,
        temp: m.tempC,
        wind: `${m.windDir}/${m.windSpeedKts}`,
        visibility: m.visibility,
      },
      geometry: { type: "Point", coordinates: [m.lon, m.lat] },
    });
  }

  // --- SIGMETs ---
  const sigmets = parseSIGMET_GeoJSON(
    sigmetGeoJSON as Parameters<typeof parseSIGMET_GeoJSON>[0],
  );
  const sigmetFeatures: GeoJSON.Feature[] = sigmets.map((s) => ({
    type: "Feature",
    properties: {
      id: s.id,
      type: s.type,
      hazard: s.hazard,
      minFl: s.altRange.minFl,
      maxFl: s.altRange.maxFl,
    },
    geometry: {
      type: "Polygon",
      coordinates: [s.polygon.map((p) => [p.lon, p.lat])],
    },
  }));

  // --- PIREPs ---
  const pireps = pirepStrings.map((raw) => parsePIREP(raw));
  const pirepFeatures: GeoJSON.Feature[] = pireps.map((p) => ({
    type: "Feature",
    properties: {
      type: "pirep",
      altitudeFt: p.altitudeFt,
      turbulence: p.turbulence ?? "NONE",
      icing: p.icing ?? "NONE",
      color: TURB_COLORS[p.turbulence ?? "NEG"] ?? "#6b7280",
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] },
  }));

  return {
    windBarbs: { type: "FeatureCollection", features: windBarbFeatures },
    sigmets: { type: "FeatureCollection", features: sigmetFeatures },
    pireps: { type: "FeatureCollection", features: pirepFeatures },
  };
}

/** Approximate station coordinates for demo METARs */
const STATION_COORDS: Record<string, { lat: number; lon: number }> = {
  KJFK: { lat: 40.6413, lon: -73.7781 },
  KLAX: { lat: 33.9425, lon: -118.4081 },
  KORD: { lat: 41.9742, lon: -87.9073 },
  KSFO: { lat: 37.6213, lon: -122.379 },
  EGLL: { lat: 51.47, lon: -0.4543 },
  LFPG: { lat: 49.0097, lon: 2.5479 },
};
