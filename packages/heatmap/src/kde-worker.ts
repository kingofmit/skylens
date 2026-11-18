/**
 * Self-contained KDE (Kernel Density Estimation) computation module for WebWorker execution.
 *
 * Message protocol:
 *   WorkerTask.type === "kde"
 *   WorkerTask.data  => KDEWorkerInput
 *   WorkerResult.data => KDEWorkerOutput
 */

// ---------------------------------------------------------------------------
// Type-only imports (stripped at compile time, safe for workers)
// ---------------------------------------------------------------------------
import type { WorkerTask, WorkerResult } from "@skylens/core";

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** Bounding box for the KDE grid (inlined to keep worker self-contained) */
export interface KDEBBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** Input payload sent to this worker */
export interface KDEWorkerInput {
  /** Latitude values – one per data point */
  latitudes: Float64Array;
  /** Longitude values – one per data point */
  longitudes: Float64Array;
  /** Geographic bounding box of the output grid */
  bbox: KDEBBox;
  /** Number of grid cells along each axis */
  resolution: number;
  /** Gaussian kernel bandwidth in degrees */
  bandwidth: number;
}

/** A single heatmap cell produced by the KDE */
export interface KDEHeatmapCell {
  lat: number;
  lon: number;
  value: number;
}

/** Output payload returned from this worker */
export type KDEWorkerOutput = KDEHeatmapCell[];

// ---------------------------------------------------------------------------
// Core computation (self-contained, no runtime imports)
// ---------------------------------------------------------------------------

/**
 * Compute Gaussian kernel density estimation over a regular grid.
 *
 * Accepts raw typed arrays so that buffers can be transferred into the worker
 * without copying.
 */
export function computeKDEInWorker(
  latitudes: Float64Array,
  longitudes: Float64Array,
  bbox: KDEBBox,
  resolution: number,
  bandwidth: number,
): KDEHeatmapCell[] {
  const latStep = (bbox.maxLat - bbox.minLat) / resolution;
  const lonStep = (bbox.maxLon - bbox.minLon) / resolution;
  const bwSq = bandwidth * bandwidth;
  const pointCount = latitudes.length;
  const cells: KDEHeatmapCell[] = [];

  for (let r = 0; r < resolution; r++) {
    const lat = bbox.minLat + (r + 0.5) * latStep;
    for (let c = 0; c < resolution; c++) {
      const lon = bbox.minLon + (c + 0.5) * lonStep;
      let density = 0;
      for (let i = 0; i < pointCount; i++) {
        const dLat = latitudes[i] - lat;
        const dLon = longitudes[i] - lon;
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

// ---------------------------------------------------------------------------
// Worker onmessage handler
// ---------------------------------------------------------------------------

if (typeof self !== "undefined") {
  (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = (
    e: MessageEvent<WorkerTask<KDEWorkerInput>>,
  ) => {
    const { id, type, data } = e.data;

    if (type !== "kde") {
      const result: WorkerResult<never> = { id, error: `Unknown task type: ${type}` };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
      return;
    }

    try {
      const cells = computeKDEInWorker(
        data.latitudes,
        data.longitudes,
        data.bbox,
        data.resolution,
        data.bandwidth,
      );
      const result: WorkerResult<KDEWorkerOutput> = { id, data: cells };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const result: WorkerResult<never> = { id, error: message };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
    }
  };
}
