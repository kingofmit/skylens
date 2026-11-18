/**
 * Self-contained Catmull-Rom path smoothing module for WebWorker execution.
 *
 * Message protocol:
 *   WorkerTask.type === "smooth"
 *   WorkerTask.data  => SmoothWorkerInput
 *   WorkerResult.data => SmoothWorkerOutput
 */

// ---------------------------------------------------------------------------
// Type-only imports (stripped at compile time, safe for workers)
// ---------------------------------------------------------------------------
import type { WorkerTask, WorkerResult } from "@skylens-aviation/core";

// ---------------------------------------------------------------------------
// Message protocol types
// ---------------------------------------------------------------------------

/** Input payload sent to this worker */
export interface SmoothWorkerInput {
  /** X coordinates of the control points */
  x: Float64Array;
  /** Y coordinates of the control points */
  y: Float64Array;
  /** Z coordinates of the control points */
  z: Float64Array;
  /** Number of interpolated points to generate per segment (default 4) */
  pointsPerSegment: number;
}

/** Output payload returned from this worker */
export interface SmoothWorkerOutput {
  x: Float64Array;
  y: Float64Array;
  z: Float64Array;
}

// ---------------------------------------------------------------------------
// Inline Catmull-Rom math (self-contained, no runtime imports)
// ---------------------------------------------------------------------------

/**
 * Catmull-Rom spline interpolation between four control values.
 *
 * Given values p0, p1, p2, p3 and parameter t in [0, 1], returns the
 * interpolated value on the spline segment between p1 and p2.
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

// ---------------------------------------------------------------------------
// Core computation (self-contained, no runtime imports)
// ---------------------------------------------------------------------------

/**
 * Smooth a 3D path using Catmull-Rom spline interpolation.
 *
 * Accepts raw Float64Arrays so that buffers can be transferred into the
 * worker without copying.
 *
 * Returns new Float64Arrays for x, y, z containing the smoothed path.
 * The smoothed path covers the interior segments (indices 1..n-3) with
 * `pointsPerSegment` subdivisions each.
 */
export function smoothPathInWorker(
  x: Float64Array,
  y: Float64Array,
  z: Float64Array,
  pointsPerSegment: number,
): SmoothWorkerOutput {
  const n = x.length;

  // Need at least 4 control points for Catmull-Rom
  if (n < 4) {
    return {
      x: new Float64Array(x),
      y: new Float64Array(y),
      z: new Float64Array(z),
    };
  }

  const segmentCount = n - 3; // segments from index 1 to n-3
  const totalPoints = segmentCount * pointsPerSegment;

  const outX = new Float64Array(totalPoints);
  const outY = new Float64Array(totalPoints);
  const outZ = new Float64Array(totalPoints);

  let idx = 0;
  for (let i = 1; i < n - 2; i++) {
    for (let j = 0; j < pointsPerSegment; j++) {
      const t = j / pointsPerSegment;
      outX[idx] = catmullRom(x[i - 1], x[i], x[i + 1], x[i + 2], t);
      outY[idx] = catmullRom(y[i - 1], y[i], y[i + 1], y[i + 2], t);
      outZ[idx] = catmullRom(z[i - 1], z[i], z[i + 1], z[i + 2], t);
      idx++;
    }
  }

  return { x: outX, y: outY, z: outZ };
}

// ---------------------------------------------------------------------------
// Worker onmessage handler
// ---------------------------------------------------------------------------

if (typeof self !== "undefined") {
  (self as unknown as { onmessage: ((e: MessageEvent) => void) | null }).onmessage = (
    e: MessageEvent<WorkerTask<SmoothWorkerInput>>,
  ) => {
    const { id, type, data } = e.data;

    if (type !== "smooth") {
      const result: WorkerResult<never> = { id, error: `Unknown task type: ${type}` };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
      return;
    }

    try {
      const output = smoothPathInWorker(data.x, data.y, data.z, data.pointsPerSegment);
      const result: WorkerResult<SmoothWorkerOutput> = { id, data: output };
      // Transfer the output buffers back to avoid copying
      (self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
        result,
        [output.x.buffer, output.y.buffer, output.z.buffer] as Transferable[],
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const result: WorkerResult<never> = { id, error: message };
      (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(result);
    }
  };
}
