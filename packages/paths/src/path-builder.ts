import { StateVector, Position3D, geoToEnu, ftToM, catmullRomInterpolate } from "@skylens-aviation/core";

export interface PathSegment {
  positions: Position3D[];
  altitudes: number[];
  speeds: number[];
  timestamps: number[];
}

/** Build a 3D path from flight track state vectors */
export function buildFlightPath(
  states: StateVector[],
  refLat: number,
  refLon: number,
): PathSegment {
  const positions: Position3D[] = [];
  const altitudes: number[] = [];
  const speeds: number[] = [];
  const timestamps: number[] = [];

  for (const s of states) {
    positions.push(geoToEnu(s.latitude, s.longitude, ftToM(s.altitudeFt), refLat, refLon));
    altitudes.push(s.altitudeFt);
    speeds.push(s.groundSpeedKts);
    timestamps.push(s.timestamp);
  }

  return { positions, altitudes, speeds, timestamps };
}

/** Smooth a path using Catmull-Rom spline interpolation */
export function smoothPath(segment: PathSegment, subdivisions: number = 4): PathSegment {
  if (segment.positions.length < 4) return segment;
  const result: PathSegment = { positions: [], altitudes: [], speeds: [], timestamps: [] };
  for (let i = 1; i < segment.positions.length - 2; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const t = j / subdivisions;
      result.positions.push({
        x: catmullRomInterpolate(segment.positions[i - 1].x, segment.positions[i].x, segment.positions[i + 1].x, segment.positions[i + 2].x, t),
        y: catmullRomInterpolate(segment.positions[i - 1].y, segment.positions[i].y, segment.positions[i + 1].y, segment.positions[i + 2].y, t),
        z: catmullRomInterpolate(segment.positions[i - 1].z, segment.positions[i].z, segment.positions[i + 1].z, segment.positions[i + 2].z, t),
      });
      result.altitudes.push(catmullRomInterpolate(segment.altitudes[i - 1], segment.altitudes[i], segment.altitudes[i + 1], segment.altitudes[i + 2], t));
      result.speeds.push(catmullRomInterpolate(segment.speeds[i - 1], segment.speeds[i], segment.speeds[i + 1], segment.speeds[i + 2], t));
      result.timestamps.push(catmullRomInterpolate(segment.timestamps[i - 1], segment.timestamps[i], segment.timestamps[i + 1], segment.timestamps[i + 2], t));
    }
  }
  return result;
}
