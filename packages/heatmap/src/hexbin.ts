import { StateVector, BoundingBox, HexBinCell } from "@skylens-aviation/core";

/** Build a hex-bin aggregated heatmap */
export function buildHexBinHeatmap(
  states: StateVector[],
  bbox: BoundingBox,
  hexRadiusDeg: number,
): HexBinCell[] {
  const bins = new Map<string, { lat: number; lon: number; count: number }>();

  const height = hexRadiusDeg * Math.sqrt(3);
  const width = hexRadiusDeg * 2;

  for (const s of states) {
    if (
      s.latitude < bbox.minLat || s.latitude > bbox.maxLat ||
      s.longitude < bbox.minLon || s.longitude > bbox.maxLon
    ) continue;

    // Convert to axial hex coordinates (pointy-top)
    const col = (s.longitude - bbox.minLon) / (width * 0.75);
    const row = (s.latitude - bbox.minLat) / height - (Math.round(col) % 2 === 1 ? 0.5 : 0);

    const qRound = Math.round(col);
    const rRound = Math.round(row);

    const key = `${qRound}:${rRound}`;
    const existing = bins.get(key);
    if (existing) {
      existing.count++;
    } else {
      // Compute center of this hex cell
      const centerLon = bbox.minLon + qRound * width * 0.75;
      const centerLat = bbox.minLat + (rRound + (qRound % 2 === 1 ? 0.5 : 0)) * height;
      bins.set(key, { lat: centerLat, lon: centerLon, count: 1 });
    }
  }

  const cells: HexBinCell[] = [];
  for (const bin of bins.values()) {
    cells.push({
      centerLat: bin.lat,
      centerLon: bin.lon,
      radius: hexRadiusDeg,
      value: bin.count,
    });
  }
  return cells;
}

/** Normalize hex-bin values to [0, 1] */
export function normalizeHexBins(cells: HexBinCell[]): HexBinCell[] {
  if (cells.length === 0) return [];
  const max = Math.max(...cells.map((c) => c.value));
  return cells.map((c) => ({ ...c, value: max > 0 ? c.value / max : 0 }));
}
