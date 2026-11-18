import { StateVector, BoundingBox, HeatmapCell } from "@skylens-aviation/core";

export interface GridOptions {
  bbox: BoundingBox;
  latBins: number;
  lonBins: number;
}

/** Build a density grid from state vectors */
export function buildDensityGrid(states: StateVector[], options: GridOptions): HeatmapCell[] {
  const { bbox, latBins, lonBins } = options;
  const latStep = (bbox.maxLat - bbox.minLat) / latBins;
  const lonStep = (bbox.maxLon - bbox.minLon) / lonBins;
  const grid = new Float64Array(latBins * lonBins);

  for (const s of states) {
    if (s.latitude < bbox.minLat || s.latitude > bbox.maxLat) continue;
    if (s.longitude < bbox.minLon || s.longitude > bbox.maxLon) continue;
    const row = Math.min(latBins - 1, Math.floor((s.latitude - bbox.minLat) / latStep));
    const col = Math.min(lonBins - 1, Math.floor((s.longitude - bbox.minLon) / lonStep));
    grid[row * lonBins + col]++;
  }

  const cells: HeatmapCell[] = [];
  for (let r = 0; r < latBins; r++) {
    for (let c = 0; c < lonBins; c++) {
      const value = grid[r * lonBins + c];
      if (value > 0) {
        cells.push({
          lat: bbox.minLat + (r + 0.5) * latStep,
          lon: bbox.minLon + (c + 0.5) * lonStep,
          value,
        });
      }
    }
  }
  return cells;
}

/** Normalize heatmap values to [0, 1] */
export function normalizeHeatmap(cells: HeatmapCell[]): HeatmapCell[] {
  if (cells.length === 0) return [];
  const max = Math.max(...cells.map((c) => c.value));
  return cells.map((c) => ({ ...c, value: max > 0 ? c.value / max : 0 }));
}
