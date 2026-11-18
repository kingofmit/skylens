import { AirspaceBoundary, FlightTrack } from "@skylens/core";
import { SectorCrossing } from "./crossings";

/** Convert a single airspace boundary to a GeoJSON Feature */
export function airspaceBoundaryToGeoJSON(boundary: AirspaceBoundary): object {
  return {
    type: "Feature",
    properties: {
      id: boundary.id,
      name: boundary.name,
      airspaceType: boundary.type,
      ...(boundary.altRange
        ? { minFl: boundary.altRange.minFl, maxFl: boundary.altRange.maxFl }
        : {}),
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        boundary.polygon.map((p) => [p.lon, p.lat]),
      ],
    },
  };
}

/** Convert multiple airspace boundaries to a GeoJSON FeatureCollection */
export function airspaceBoundariesToGeoJSON(boundaries: AirspaceBoundary[]): object {
  return {
    type: "FeatureCollection",
    features: boundaries.map(airspaceBoundaryToGeoJSON),
  };
}

/** Convert sector crossings to GeoJSON with crossing entry/exit markers */
export function sectorCrossingsToGeoJSON(
  crossings: SectorCrossing[],
  track: FlightTrack,
): object {
  const features: object[] = [];

  // Flight track line
  features.push({
    type: "Feature",
    properties: {
      type: "track",
      icao24: track.icao24,
      callsign: track.callsign,
    },
    geometry: {
      type: "LineString",
      coordinates: track.states.map((s) => [s.longitude, s.latitude]),
    },
  });

  // Crossing markers
  for (const crossing of crossings) {
    features.push({
      type: "Feature",
      properties: {
        type: "sector_entry",
        sectorId: crossing.boundary.id,
        sectorName: crossing.boundary.name,
        time: crossing.entryTime,
      },
      geometry: {
        type: "Point",
        coordinates: [crossing.entryPoint.lon, crossing.entryPoint.lat],
      },
    });
    features.push({
      type: "Feature",
      properties: {
        type: "sector_exit",
        sectorId: crossing.boundary.id,
        sectorName: crossing.boundary.name,
        time: crossing.exitTime,
      },
      geometry: {
        type: "Point",
        coordinates: [crossing.exitPoint.lon, crossing.exitPoint.lat],
      },
    });
  }

  return { type: "FeatureCollection", features };
}
