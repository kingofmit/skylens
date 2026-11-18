import { Position3D } from "@skylens/core";
import { simplifyPath } from "./simplify";

/** Level-of-detail configuration */
export interface LODLevel {
  zoomRange: [number, number];
  epsilon: number;
}

/** Default LOD levels mapping zoom ranges to simplification epsilon */
export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { zoomRange: [0, 4], epsilon: 5000 },
  { zoomRange: [5, 7], epsilon: 1000 },
  { zoomRange: [8, 10], epsilon: 200 },
  { zoomRange: [11, 13], epsilon: 50 },
  { zoomRange: [14, 16], epsilon: 10 },
  { zoomRange: [17, 22], epsilon: 1 },
];

/** Simplify a path for a given zoom level using LOD configuration */
export function simplifyForZoom(
  points: Position3D[],
  zoom: number,
  levels: LODLevel[] = DEFAULT_LOD_LEVELS,
): Position3D[] {
  const level = levels.find(
    (l) => zoom >= l.zoomRange[0] && zoom <= l.zoomRange[1],
  );
  if (!level) return points;
  return simplifyPath(points, level.epsilon);
}

/** Precompute simplified paths for all LOD levels */
export function precomputeLOD(
  points: Position3D[],
  levels: LODLevel[] = DEFAULT_LOD_LEVELS,
): Map<number, Position3D[]> {
  const cache = new Map<number, Position3D[]>();
  for (const level of levels) {
    const simplified = simplifyPath(points, level.epsilon);
    // Store for each zoom in the range
    for (let z = level.zoomRange[0]; z <= level.zoomRange[1]; z++) {
      cache.set(z, simplified);
    }
  }
  return cache;
}
