import type { FlightTrack, AirspaceBoundary, WaypointFix, FlightDNAMetrics } from "@skylens/core";
import { mapHealthToColor, mapAnomalyToEventMarkers } from "@skylens/core";
import { detectHoldingPatterns } from "@skylens/paths";
import { annotateWaypoints } from "@skylens/paths";
import { detectSectorCrossings } from "@skylens/airspace";
import { sectorCrossingsToGeoJSON } from "@skylens/airspace";

/**
 * Build GeoJSON for overlay markers:
 * - Holding pattern centers
 * - Waypoint annotations
 * - Sector crossing entry/exit points
 * - FlightDNA anomaly markers
 */
export function getMarkerGeoJSON(
  tracks: FlightTrack[],
  waypointFixes: WaypointFix[],
  boundaries: AirspaceBoundary[],
  flightDNAMetrics: FlightDNAMetrics[],
): {
  holdingPatterns: GeoJSON.FeatureCollection;
  waypoints: GeoJSON.FeatureCollection;
  crossings: GeoJSON.FeatureCollection;
  anomalyMarkers: GeoJSON.FeatureCollection;
  healthPath: GeoJSON.FeatureCollection;
} {
  const holdingFeatures: GeoJSON.Feature[] = [];
  const waypointFeatures: GeoJSON.Feature[] = [];
  const crossingFeatures: GeoJSON.Feature[] = [];

  for (const track of tracks) {
    // Holding patterns
    const holds = detectHoldingPatterns(track);
    for (const hold of holds) {
      holdingFeatures.push({
        type: "Feature",
        properties: {
          type: "holding",
          icao24: track.icao24,
          orbits: hold.orbits,
          legLengthM: hold.legLengthM,
          startTime: hold.startTime,
          endTime: hold.endTime,
        },
        geometry: {
          type: "Point",
          coordinates: [hold.centerLon, hold.centerLat],
        },
      });
    }

    // Waypoint annotations
    const annotations = annotateWaypoints(track, waypointFixes);
    for (const ann of annotations) {
      waypointFeatures.push({
        type: "Feature",
        properties: {
          type: "waypoint",
          name: ann.fix.name,
          fixType: ann.fix.type,
          distanceM: Math.round(ann.distanceM),
        },
        geometry: {
          type: "Point",
          coordinates: [ann.fix.lon, ann.fix.lat],
        },
      });
    }

    // Sector crossings
    const crossings = detectSectorCrossings(track, boundaries);
    const crossingGJ = sectorCrossingsToGeoJSON(crossings, track) as GeoJSON.FeatureCollection;
    // Filter to just point features (entry/exit markers)
    for (const f of crossingGJ.features) {
      if (f.geometry.type === "Point") {
        crossingFeatures.push(f);
      }
    }
  }

  // FlightDNA anomaly markers
  const anomalyEvents = mapAnomalyToEventMarkers(flightDNAMetrics);
  const anomalyFeatures: GeoJSON.Feature[] = [];

  // Map anomaly timestamps to track positions
  for (const event of anomalyEvents) {
    const metric = flightDNAMetrics.find((m) => m.timestamp === event.time);
    if (!metric) continue;
    // Find closest track state to this timestamp
    for (const track of tracks) {
      if (track.icao24 !== metric.icao24) continue;
      const closest = track.states.reduce((best, s) =>
        Math.abs(s.timestamp - event.time) < Math.abs(best.timestamp - event.time) ? s : best,
      );
      anomalyFeatures.push({
        type: "Feature",
        properties: {
          type: "anomaly",
          label: event.label,
          healthScore: metric.healthScore,
          time: event.time,
        },
        geometry: {
          type: "Point",
          coordinates: [closest.longitude, closest.latitude],
        },
      });
      break;
    }
  }

  // Health-colored path segments for analytics view
  const healthFeatures: GeoJSON.Feature[] = [];
  for (const track of tracks) {
    const metricsForTrack = flightDNAMetrics.filter((m) => m.icao24 === track.icao24);
    if (metricsForTrack.length === 0) continue;

    for (let i = 0; i < metricsForTrack.length - 1; i++) {
      const m = metricsForTrack[i];
      const mNext = metricsForTrack[i + 1];
      const color = mapHealthToColor(m.healthScore);
      const colorStr = `rgb(${color.r},${color.g},${color.b})`;

      // Find states in this time window
      const segStates = track.states.filter(
        (s) => s.timestamp >= m.timestamp && s.timestamp <= mNext.timestamp,
      );
      if (segStates.length < 2) continue;

      healthFeatures.push({
        type: "Feature",
        properties: {
          type: "health_segment",
          healthScore: m.healthScore,
          color: colorStr,
        },
        geometry: {
          type: "LineString",
          coordinates: segStates.map((s) => [s.longitude, s.latitude]),
        },
      });
    }
  }

  return {
    holdingPatterns: { type: "FeatureCollection", features: holdingFeatures },
    waypoints: { type: "FeatureCollection", features: waypointFeatures },
    crossings: { type: "FeatureCollection", features: crossingFeatures },
    anomalyMarkers: { type: "FeatureCollection", features: anomalyFeatures },
    healthPath: { type: "FeatureCollection", features: healthFeatures },
  };
}
