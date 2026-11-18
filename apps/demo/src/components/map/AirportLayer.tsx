import type { FlightTrack } from "@skylens/core";
import { bearing } from "@skylens/core";
import type { RunwayDefinition } from "@skylens/airport";

interface AirportInfo {
  center: { lat: number; lon: number };
  runways: RunwayDefinition[];
  gates: { name: string; lat: number; lon: number }[];
}

/**
 * Build GeoJSON for airport surface visualization:
 * - Surface tracks as LineStrings
 * - Runways as thick LineStrings
 * - Gate positions as Points
 */
export function getAirportGeoJSON(
  surfaceTracks: FlightTrack[],
  airport: AirportInfo,
): {
  surfacePaths: GeoJSON.FeatureCollection;
  runways: GeoJSON.FeatureCollection;
  gates: GeoJSON.FeatureCollection;
} {
  // --- Surface track lines ---
  const surfaceFeatures: GeoJSON.Feature[] = surfaceTracks.map((track) => {
    const coords = track.states
      .filter((s) => s.onGround)
      .map((s) => [s.longitude, s.latitude]);

    return {
      type: "Feature",
      properties: {
        icao24: track.icao24,
        callsign: track.callsign ?? track.icao24,
        type: "surface_track",
      },
      geometry: { type: "LineString", coordinates: coords },
    };
  });

  // --- Runways as lines ---
  const runwayFeatures: GeoJSON.Feature[] = airport.runways.map((rwy) => {
    const headRad = (rwy.headingDeg * Math.PI) / 180;
    const dLat = (rwy.lengthM / 111320) * Math.cos(headRad);
    const dLon =
      (rwy.lengthM / (111320 * Math.cos((rwy.thresholdLat * Math.PI) / 180))) *
      Math.sin(headRad);

    return {
      type: "Feature",
      properties: {
        name: rwy.name,
        type: "runway",
        heading: rwy.headingDeg,
        lengthM: rwy.lengthM,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [rwy.thresholdLon, rwy.thresholdLat],
          [rwy.thresholdLon + dLon, rwy.thresholdLat + dLat],
        ],
      },
    };
  });

  // --- Gate positions ---
  const gateFeatures: GeoJSON.Feature[] = airport.gates.map((gate) => ({
    type: "Feature",
    properties: {
      name: gate.name,
      type: "gate",
    },
    geometry: { type: "Point", coordinates: [gate.lon, gate.lat] },
  }));

  return {
    surfacePaths: { type: "FeatureCollection", features: surfaceFeatures },
    runways: { type: "FeatureCollection", features: runwayFeatures },
    gates: { type: "FeatureCollection", features: gateFeatures },
  };
}
