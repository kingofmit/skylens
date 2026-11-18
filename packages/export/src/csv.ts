import { FlightTrack, StateVector } from "@skylens-aviation/core";

export function flightTrackToCSV(track: FlightTrack): string {
  const header = "timestamp,icao24,callsign,latitude,longitude,altitude_ft,ground_speed_kts,track_deg,vertical_rate_fpm,on_ground";
  const rows = track.states.map((s) =>
    `${s.timestamp},${s.icao24},${s.callsign ?? ""},${s.latitude},${s.longitude},${s.altitudeFt},${s.groundSpeedKts},${s.trackDeg},${s.verticalRateFpm},${s.onGround}`
  );
  return [header, ...rows].join("\n");
}

export function stateVectorsToCSV(states: StateVector[]): string {
  const header = "timestamp,icao24,callsign,latitude,longitude,altitude_ft,ground_speed_kts,track_deg,vertical_rate_fpm,on_ground";
  const rows = states.map((s) =>
    `${s.timestamp},${s.icao24},${s.callsign ?? ""},${s.latitude},${s.longitude},${s.altitudeFt},${s.groundSpeedKts},${s.trackDeg},${s.verticalRateFpm},${s.onGround}`
  );
  return [header, ...rows].join("\n");
}
