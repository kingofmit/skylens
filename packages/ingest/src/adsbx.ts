import { StateVector, BoundingBox } from "@skylens-aviation/core";

export interface ADSBxOptions {
  apiKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE = "https://adsbexchange.com/api/v2";

/** Fetch current state vectors from ADS-B Exchange v2 API */
export async function fetchADSBx(
  bbox?: BoundingBox,
  options?: ADSBxOptions,
): Promise<StateVector[]> {
  if (!options?.apiKey) throw new Error("ADS-B Exchange API key required");
  const base = options.baseUrl ?? DEFAULT_BASE;

  let url: string;
  if (bbox) {
    const lat = (bbox.minLat + bbox.maxLat) / 2;
    const lon = (bbox.minLon + bbox.maxLon) / 2;
    const dist = Math.max(
      Math.abs(bbox.maxLat - bbox.minLat),
      Math.abs(bbox.maxLon - bbox.minLon),
    ) * 60;
    url = `${base}/lat/${lat}/lon/${lon}/dist/${Math.ceil(dist)}/`;
  } else {
    url = `${base}/all/`;
  }

  const res = await fetch(url, {
    headers: { "api-auth": options.apiKey },
  });
  if (!res.ok) throw new Error(`ADS-B Exchange API error: ${res.status}`);
  const data = await res.json();
  return parseADSBxResponse(data);
}

/** Parse ADS-B Exchange v2 JSON response into StateVectors */
export function parseADSBxResponse(data: { ac?: Record<string, unknown>[] }): StateVector[] {
  if (!data.ac) return [];
  const states: StateVector[] = [];
  for (const ac of data.ac) {
    const lat = ac.lat as number | undefined;
    const lon = ac.lon as number | undefined;
    if (lat == null || lon == null) continue;
    states.push({
      icao24: (ac.hex as string ?? "").toLowerCase(),
      callsign: (ac.flight as string)?.trim() ?? null,
      timestamp: (ac.now as number) ?? Date.now() / 1000,
      latitude: lat,
      longitude: lon,
      altitudeFt: (ac.alt_baro as number) ?? (ac.alt_geom as number) ?? 0,
      groundSpeedKts: (ac.gs as number) ?? 0,
      trackDeg: (ac.track as number) ?? 0,
      verticalRateFpm: (ac.baro_rate as number) ?? (ac.geom_rate as number) ?? 0,
      onGround: (ac.alt_baro as string) === "ground" || (ac.ground as boolean) === true,
    });
  }
  return states;
}
