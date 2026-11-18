import type { FlightTrack } from "@skylens/core";
import { PHASE_COLORS } from "../../lib/colors";

/**
 * Convert flight tracks to a GeoJSON FeatureCollection for rendering
 * flight path lines on the map.
 */
export function getFlightPathGeoJSON(
  tracks: FlightTrack[],
  selectedFlight: string | null,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const track of tracks) {
    const isSelected = track.icao24 === selectedFlight;

    // Build a single LineString per track with altitude-based coloring metadata
    const coordinates = track.states
      .filter((s) => !s.onGround)
      .map((s) => [s.longitude, s.latitude]);

    if (coordinates.length < 2) continue;

    features.push({
      type: "Feature",
      properties: {
        icao24: track.icao24,
        callsign: track.callsign ?? track.icao24,
        selected: isSelected,
        origin: track.origin,
        destination: track.destination,
        maxAlt: Math.max(...track.states.map((s) => s.altitudeFt)),
      },
      geometry: {
        type: "LineString",
        coordinates,
      },
    });

    // Also emit a point at the last known position (aircraft icon)
    const last = track.states[track.states.length - 1];
    features.push({
      type: "Feature",
      properties: {
        type: "aircraft",
        icao24: track.icao24,
        callsign: track.callsign ?? track.icao24,
        selected: isSelected,
        altitude: last.altitudeFt,
        heading: last.trackDeg,
      },
      geometry: {
        type: "Point",
        coordinates: [last.longitude, last.latitude],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/**
 * Phase-segmented GeoJSON: breaks each track into segments colored by flight phase.
 */
export function getPhaseSegmentedGeoJSON(
  tracks: FlightTrack[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const track of tracks) {
    const { states } = track;
    if (states.length < 2) continue;

    // Simple phase classification based on vertical rate and altitude
    let currentPhase = classifyPhase(states[0]);
    let segCoords: [number, number][] = [[states[0].longitude, states[0].latitude]];

    for (let i = 1; i < states.length; i++) {
      const phase = classifyPhase(states[i]);
      segCoords.push([states[i].longitude, states[i].latitude]);

      if (phase !== currentPhase || i === states.length - 1) {
        if (segCoords.length >= 2) {
          features.push({
            type: "Feature",
            properties: {
              icao24: track.icao24,
              phase: currentPhase,
              color: PHASE_COLORS[currentPhase] ?? "#ffffff",
            },
            geometry: { type: "LineString", coordinates: segCoords },
          });
        }
        currentPhase = phase;
        segCoords = [[states[i].longitude, states[i].latitude]];
      }
    }
  }

  return { type: "FeatureCollection", features };
}

function classifyPhase(
  s: { altitudeFt: number; verticalRateFpm: number; onGround: boolean; groundSpeedKts: number },
): string {
  if (s.onGround) return s.groundSpeedKts > 50 ? "takeoff" : "ground";
  if (s.altitudeFt < 1000) return s.verticalRateFpm > 200 ? "takeoff" : "landing";
  if (s.verticalRateFpm > 500) return "climb";
  if (s.verticalRateFpm < -500) return "descent";
  if (s.altitudeFt < 5000 && s.verticalRateFpm < -100) return "approach";
  return "cruise";
}
