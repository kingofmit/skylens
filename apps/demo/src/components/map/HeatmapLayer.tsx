import type { FlightTrack, BoundingBox, HeatmapCell, HexBinCell } from "@skylens/core";
import { buildDensityGrid, normalizeHeatmap } from "@skylens/heatmap";
import { kernelDensityEstimate } from "@skylens/heatmap";
import { buildHexBinHeatmap, normalizeHexBins } from "@skylens/heatmap";

export type HeatmapMode = "none" | "density" | "kde" | "hexbin";

/** Default bounding box for the main dataset (US + Europe) */
function computeBBox(tracks: FlightTrack[]): BoundingBox {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const track of tracks) {
    for (const s of track.states) {
      if (s.latitude < minLat) minLat = s.latitude;
      if (s.latitude > maxLat) maxLat = s.latitude;
      if (s.longitude < minLon) minLon = s.longitude;
      if (s.longitude > maxLon) maxLon = s.longitude;
    }
  }
  // Add padding
  const latPad = (maxLat - minLat) * 0.1;
  const lonPad = (maxLon - minLon) * 0.1;
  return {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };
}

/**
 * Compute heatmap GeoJSON points with weight property for MapLibre's
 * built-in heatmap layer type.
 */
export function getHeatmapGeoJSON(
  tracks: FlightTrack[],
  mode: HeatmapMode,
  bboxOverride?: BoundingBox,
): GeoJSON.FeatureCollection {
  if (mode === "none") {
    return { type: "FeatureCollection", features: [] };
  }

  const allStates = tracks.flatMap((t) => t.states);
  const bbox = bboxOverride ?? computeBBox(tracks);

  let cells: { lat: number; lon: number; value: number }[] = [];

  switch (mode) {
    case "density": {
      const raw = buildDensityGrid(allStates, { bbox, latBins: 40, lonBins: 40 });
      cells = normalizeHeatmap(raw);
      break;
    }
    case "kde": {
      const raw = kernelDensityEstimate(allStates, bbox, 30, 0.5);
      // Normalize manually
      const max = Math.max(...raw.map((c) => c.value), 1);
      cells = raw.map((c) => ({ ...c, value: c.value / max }));
      break;
    }
    case "hexbin": {
      const raw = buildHexBinHeatmap(allStates, bbox, 0.5);
      const norm = normalizeHexBins(raw);
      cells = norm.map((h) => ({ lat: h.centerLat, lon: h.centerLon, value: h.value }));
      break;
    }
  }

  const features: GeoJSON.Feature[] = cells.map((cell) => ({
    type: "Feature",
    properties: { weight: cell.value },
    geometry: { type: "Point", coordinates: [cell.lon, cell.lat] },
  }));

  return { type: "FeatureCollection", features };
}
