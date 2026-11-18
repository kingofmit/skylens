import { BoundingBox } from "./types";
import { haversineDistance } from "./coordinates";

/** Grid-hash spatial index for efficient point-in-region queries */
export class SpatialIndex {
  private cellSize: number;
  private grid = new Map<string, Set<string>>();
  private positions = new Map<string, { lat: number; lon: number }>();

  constructor(cellSizeDeg: number = 1) {
    this.cellSize = cellSizeDeg;
  }

  get size(): number {
    return this.positions.size;
  }

  insert(id: string, lat: number, lon: number): void {
    this.remove(id);
    const key = this.cellKey(lat, lon);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = new Set();
      this.grid.set(key, cell);
    }
    cell.add(id);
    this.positions.set(id, { lat, lon });
  }

  bulkInsert(items: { id: string; lat: number; lon: number }[]): void {
    for (const item of items) {
      this.insert(item.id, item.lat, item.lon);
    }
  }

  remove(id: string): boolean {
    const pos = this.positions.get(id);
    if (!pos) return false;
    const key = this.cellKey(pos.lat, pos.lon);
    const cell = this.grid.get(key);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) this.grid.delete(key);
    }
    this.positions.delete(id);
    return true;
  }

  queryBBox(bbox: BoundingBox): string[] {
    const results: string[] = [];
    const minLatBin = Math.floor(bbox.minLat / this.cellSize);
    const maxLatBin = Math.floor(bbox.maxLat / this.cellSize);
    const minLonBin = Math.floor(bbox.minLon / this.cellSize);
    const maxLonBin = Math.floor(bbox.maxLon / this.cellSize);

    for (let latBin = minLatBin; latBin <= maxLatBin; latBin++) {
      for (let lonBin = minLonBin; lonBin <= maxLonBin; lonBin++) {
        const cell = this.grid.get(`${latBin}:${lonBin}`);
        if (!cell) continue;
        for (const id of cell) {
          const pos = this.positions.get(id)!;
          if (
            pos.lat >= bbox.minLat &&
            pos.lat <= bbox.maxLat &&
            pos.lon >= bbox.minLon &&
            pos.lon <= bbox.maxLon
          ) {
            results.push(id);
          }
        }
      }
    }
    return results;
  }

  queryRadius(lat: number, lon: number, radiusM: number): string[] {
    const latSpread = (radiusM / 111_320) / this.cellSize;
    const lonSpread = (radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))) / this.cellSize;

    const centerLatBin = Math.floor(lat / this.cellSize);
    const centerLonBin = Math.floor(lon / this.cellSize);
    const dLat = Math.ceil(latSpread);
    const dLon = Math.ceil(lonSpread);

    const results: string[] = [];
    for (let latBin = centerLatBin - dLat; latBin <= centerLatBin + dLat; latBin++) {
      for (let lonBin = centerLonBin - dLon; lonBin <= centerLonBin + dLon; lonBin++) {
        const cell = this.grid.get(`${latBin}:${lonBin}`);
        if (!cell) continue;
        for (const id of cell) {
          const pos = this.positions.get(id)!;
          if (haversineDistance(lat, lon, pos.lat, pos.lon) <= radiusM) {
            results.push(id);
          }
        }
      }
    }
    return results;
  }

  clear(): void {
    this.grid.clear();
    this.positions.clear();
  }

  private cellKey(lat: number, lon: number): string {
    return `${Math.floor(lat / this.cellSize)}:${Math.floor(lon / this.cellSize)}`;
  }
}
