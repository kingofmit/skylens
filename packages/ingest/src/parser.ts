import { StateVector, FlightTrack } from "@skylens/core";

/** Parse CSV flight data (SBS BaseStation format) */
export function parseSBS(csv: string): StateVector[] {
  const lines = csv.trim().split("\n");
  const states: StateVector[] = [];
  for (const line of lines) {
    const parts = line.split(",");
    if (parts[0] !== "MSG" || parts[1] !== "3") continue;
    const icao24 = parts[4]?.trim();
    const date = parts[6]?.trim();
    const time = parts[7]?.trim();
    if (!icao24 || !date || !time) continue;
    const lat = parseFloat(parts[14]);
    const lon = parseFloat(parts[15]);
    const alt = parseFloat(parts[11]);
    if (isNaN(lat) || isNaN(lon)) continue;
    states.push({
      icao24,
      callsign: parts[10]?.trim() || null,
      timestamp: new Date(`${date} ${time}`).getTime() / 1000,
      latitude: lat,
      longitude: lon,
      altitudeFt: isNaN(alt) ? 0 : alt,
      groundSpeedKts: parseFloat(parts[12]) || 0,
      trackDeg: parseFloat(parts[13]) || 0,
      verticalRateFpm: parseFloat(parts[16]) || 0,
      onGround: alt <= 0,
    });
  }
  return states;
}

/** Group state vectors into flight tracks by icao24 */
export function assembleFlightTracks(states: StateVector[]): FlightTrack[] {
  const byIcao = new Map<string, StateVector[]>();
  for (const s of states) {
    const list = byIcao.get(s.icao24) ?? [];
    list.push(s);
    byIcao.set(s.icao24, list);
  }
  const tracks: FlightTrack[] = [];
  for (const [icao24, trackStates] of byIcao) {
    trackStates.sort((a, b) => a.timestamp - b.timestamp);
    tracks.push({
      icao24,
      callsign: trackStates[0].callsign,
      origin: null,
      destination: null,
      states: trackStates,
    });
  }
  return tracks;
}
