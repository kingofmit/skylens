import { Position3D } from "@skylens-aviation/core";

/** Ramer-Douglas-Peucker line simplification */
export function simplifyPath(points: Position3D[], epsilon: number): Position3D[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function perpendicularDistance(point: Position3D, lineStart: Position3D, lineEnd: Position3D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const dz = lineEnd.z - lineStart.z;
  const lenSq = dx * dx + dy * dy + dz * dz;
  if (lenSq === 0) {
    const ex = point.x - lineStart.x;
    const ey = point.y - lineStart.y;
    const ez = point.z - lineStart.z;
    return Math.sqrt(ex * ex + ey * ey + ez * ez);
  }
  const t = Math.max(0, Math.min(1,
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy + (point.z - lineStart.z) * dz) / lenSq));
  const px = lineStart.x + t * dx - point.x;
  const py = lineStart.y + t * dy - point.y;
  const pz = lineStart.z + t * dz - point.z;
  return Math.sqrt(px * px + py * py + pz * pz);
}
