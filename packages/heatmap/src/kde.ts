import { StateVector, BoundingBox, HeatmapCell } from "@skylens-aviation/core";

/** Gaussian kernel density estimation for smooth heatmaps */
export function kernelDensityEstimate(
  states: StateVector[],
  bbox: BoundingBox,
  resolution: number,
  bandwidth: number,
): HeatmapCell[] {
  const latStep = (bbox.maxLat - bbox.minLat) / resolution;
  const lonStep = (bbox.maxLon - bbox.minLon) / resolution;
  const cells: HeatmapCell[] = [];
  const bwSq = bandwidth * bandwidth;

  for (let r = 0; r < resolution; r++) {
    for (let c = 0; c < resolution; c++) {
      const lat = bbox.minLat + (r + 0.5) * latStep;
      const lon = bbox.minLon + (c + 0.5) * lonStep;
      let density = 0;
      for (const s of states) {
        const dLat = s.latitude - lat;
        const dLon = s.longitude - lon;
        const distSq = dLat * dLat + dLon * dLon;
        density += Math.exp(-distSq / (2 * bwSq));
      }
      if (density > 1e-10) {
        cells.push({ lat, lon, value: density });
      }
    }
  }
  return cells;
}
