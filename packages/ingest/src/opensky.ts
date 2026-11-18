import { StateVector, BoundingBox } from "@skylens/core";

const BASE_URL = "https://opensky-network.org/api";

export interface OpenSkyOptions {
  username?: string;
  password?: string;
}

/** Fetch current state vectors from OpenSky Network */
export async function fetchStateVectors(
  bbox?: BoundingBox,
  options?: OpenSkyOptions,
): Promise<StateVector[]> {
  let url = `${BASE_URL}/states/all`;
  if (bbox) {
    url += `?lamin=${bbox.minLat}&lomin=${bbox.minLon}&lamax=${bbox.maxLat}&lomax=${bbox.maxLon}`;
  }
  const headers: Record<string, string> = {};
  if (options?.username && options?.password) {
    headers["Authorization"] = "Basic " + btoa(`${options.username}:${options.password}`);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenSky API error: ${res.status}`);
  const data = await res.json();
  return parseOpenSkyResponse(data);
}

/** Fetch flight tracks for a specific aircraft */
export async function fetchFlightTrack(
  icao24: string,
  time: number,
  options?: OpenSkyOptions,
): Promise<StateVector[]> {
  const url = `${BASE_URL}/tracks/all?icao24=${icao24}&time=${time}`;
  const headers: Record<string, string> = {};
  if (options?.username && options?.password) {
    headers["Authorization"] = "Basic " + btoa(`${options.username}:${options.password}`);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OpenSky API error: ${res.status}`);
  const data = await res.json();
  return (data.path ?? []).map((p: number[]) => ({
    icao24: data.icao24,
    callsign: data.callsign?.trim() ?? null,
    timestamp: p[0],
    latitude: p[1],
    longitude: p[2],
    altitudeFt: (p[3] ?? 0) / 0.3048,
    groundSpeedKts: 0,
    trackDeg: p[4] ?? 0,
    verticalRateFpm: 0,
    onGround: Boolean(p[5]),
  }));
}

function parseOpenSkyResponse(data: { time: number; states: unknown[][] }): StateVector[] {
  if (!data.states) return [];
  return data.states.map((s) => ({
    icao24: s[0] as string,
    callsign: (s[1] as string)?.trim() || null,
    timestamp: (s[3] as number) ?? data.time,
    latitude: s[6] as number,
    longitude: s[5] as number,
    altitudeFt: ((s[7] as number) ?? 0) / 0.3048,
    groundSpeedKts: ((s[9] as number) ?? 0) / 0.514444,
    trackDeg: (s[10] as number) ?? 0,
    verticalRateFpm: ((s[11] as number) ?? 0) * 196.85,
    onGround: s[8] as boolean,
  }));
}
