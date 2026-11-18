/**
 * Self-contained spatial index bulk operations module for WebWorker execution.
 *
 * Uses a grid-hash spatial index (same algorithm as SpatialIndex) but operates
 * on raw typed arrays for zero-copy transfer into the worker.
 *
 * Message protocol:
 *   WorkerTask.type === "spatial-bulk-insert"
 *     WorkerTask.data  => SpatialBulkInsertInput
 *     WorkerResult.data => SpatialBulkInsertOutput
 *
 *   WorkerTask.type === "spatial-query-bbox"
 *     WorkerTask.data  => SpatialQueryBBoxInput
 *     WorkerResult.data => SpatialQueryBBoxOutput
 */

// ---------------------------------------------------------------------------
// Type-only imports (stripped at compile time, safe for workers)
// ---------------------------------------------------------------------------
import type { WorkerTask, WorkerResult } from "./worker-pool";

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** Input for bulk insert */
export interface SpatialBulkInsertInput {
  /** Latitude of each point */
  latitudes: Float64Array;
  /** Longitude of each point */
  longitudes: Float64Array;
  /** Unique identifier for each point */
  ids: string[];
  /** Grid cell size in degrees (default 1) */
  cellSize: number;
}

/** Output of bulk insert -- the serialised grid state */
export interface SpatialBulkInsertOutput {
  /** Number of points inserted */
  count: number;
  /** Number of grid cells populated */
  cellCount: number;
  /** Serialised grid: cellKey -> array of ids */
  grid: Record<string, string[]>;
  /** Serialised positions: id -> { lat, lon } */
  positions: Record<string, { lat: number; lon: number }>;
}

/** Bounding box for queries (inlined to keep worker self-contained) */
export interface SpatialBBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Input for bbox query */
export interface SpatialQueryBBoxInput {
  /** The bounding box to query */
  bbox: SpatialBBox;
  /** Cell size that was used when the index was built */
  cellSize: number;
  /** Serialised grid from a previous bulk insert */
  grid: Record<string, string[]>;
  /** Serialised positions from a previous bulk insert */
  positions: Record<string, { lat: number; lon: number }>;
}

/** Output of bbox query */
export interface SpatialQueryBBoxOutput {
  /** IDs of points inside the bounding box */
  ids: string[];
}

// ---------------------------------------------------------------------------
// Inline grid-hash helpers (self-contained, no runtime imports)
// ---------------------------------------------------------------------------

function cellKey(lat: number, lon: number, cellSize: number): string {
  return `${Math.floor(lat / cellSize)}:${Math.floor(lon / cellSize)}`;
}

// ---------------------------------------------------------------------------
// Core computations
// ---------------------------------------------------------------------------

/**
 * Bulk-insert points into a grid-hash spatial index.
 *
 * Returns a serialisable representation of the index that can be sent back
 * to the main thread or fed into `queryBBoxInWorker`.
 */
export function bulkInsertInWorker(
  latitudes: Float64Array,
  longitudes: Float64Array,
  ids: string[],
  cellSize: number,
): SpatialBulkInsertOutput {
  const n = latitudes.length;
  const grid = new Map<string, string[]>();
  const positions: Record<string, { lat: number; lon: number }> = {};

  for (let i = 0; i < n; i++) {
    const lat = latitudes[i];
    const lon = longitudes[i];
    const id = ids[i];
    const key = cellKey(lat, lon, cellSize);

    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(id);
    positions[id] = { lat, lon };
  }

  // Convert Map to plain object for structured-clone transfer
  const gridObj: Record<string, string[]> = {};
  for (const [k, v] of grid) {
    gridObj[k] = v;
  }

  return {
    count: n,
    cellCount: grid.size,
    grid: gridObj,
    positions,
  };
}

/**
 * Query a previously-built spatial index for all points within a bounding box.
 */
export function queryBBoxInWorker(
  bbox: SpatialBBox,
  cellSize: number,
  grid: Record<string, string[]>,
  positions: Record<string, { lat: number; lon: number }>,
): SpatialQueryBBoxOutput {
  const results: string[] = [];
  const minLatBin = Math.floor(bbox.minLat / cellSize);
  const maxLatBin = Math.floor(bbox.maxLat / cellSize);
  const minLonBin = Math.floor(bbox.minLon / cellSize);
  const maxLonBin = Math.floor(bbox.maxLon / cellSize);

  for (let latBin = minLatBin; latBin <= maxLatBin; latBin++) {
    for (let lonBin = minLonBin; lonBin <= maxLonBin; lonBin++) {
      const key = `${latBin}:${lonBin}`;
      const cell = grid[key];
      if (!cell) continue;
      for (const id of cell) {
        const pos = positions[id];
        if (
          pos &&
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

  return { ids: results };
}

// ---------------------------------------------------------------------------
// Worker onmessage handler
// ---------------------------------------------------------------------------

if (typeof self !== "undefined") {
  (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = (
    e: MessageEvent<WorkerTask>,
  ) => {
    const { id, type, data } = e.data;

    try {
      switch (type) {
        case "spatial-bulk-insert": {
          const input = data as SpatialBulkInsertInput;
          const output = bulkInsertInWorker(
            input.latitudes,
            input.longitudes,
            input.ids,
            input.cellSize,
          );
          const result: WorkerResult<SpatialBulkInsertOutput> = { id, data: output };
          (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
          break;
        }

        case "spatial-query-bbox": {
          const input = data as SpatialQueryBBoxInput;
          const output = queryBBoxInWorker(
            input.bbox,
            input.cellSize,
            input.grid,
            input.positions,
          );
          const result: WorkerResult<SpatialQueryBBoxOutput> = { id, data: output };
          (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
          break;
        }

        default: {
          const result: WorkerResult<never> = { id, error: `Unknown task type: ${type}` };
          (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const result: WorkerResult<never> = { id, error: message };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
    }
  };
}
