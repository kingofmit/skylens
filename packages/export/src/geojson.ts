import { FlightTrack } from "@skylens-aviation/core";

export function flightTrackToGeoJSON(track: FlightTrack): object {
  return {
    type: "Feature",
    properties: {
      icao24: track.icao24,
      callsign: track.callsign,
      origin: track.origin,
      destination: track.destination,
      points: track.states.length,
    },
    geometry: {
      type: "LineString",
      coordinates: track.states.map((s) => [s.longitude, s.latitude, s.altitudeFt * 0.3048]),
    },
  };
}

export function flightTracksToGeoJSON(tracks: FlightTrack[]): object {
  return {
    type: "FeatureCollection",
    features: tracks.map(flightTrackToGeoJSON),
  };
}
