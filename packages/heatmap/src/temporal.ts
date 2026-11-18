import { StateVector, BoundingBox, HeatmapCell } from "@skylens-aviation/core";
import { buildDensityGrid, GridOptions } from "./grid";

export interface TimeSlice {
  startTime: number;
  endTime: number;
  cells: HeatmapCell[];
}

/** Build time-sliced heatmaps for animation */
export function buildTemporalHeatmap(
  states: StateVector[],
  options: GridOptions,
  sliceDurationSec: number,
): TimeSlice[] {
  if (states.length === 0) return [];
  const sorted = [...states].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const slices: TimeSlice[] = [];

  for (let t = startTime; t < endTime; t += sliceDurationSec) {
    const sliceEnd = t + sliceDurationSec;
    const sliceStates = sorted.filter((s) => s.timestamp >= t && s.timestamp < sliceEnd);
    slices.push({
      startTime: t,
      endTime: sliceEnd,
      cells: buildDensityGrid(sliceStates, options),
    });
  }
  return slices;
}
