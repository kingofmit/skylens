import { StateVector, BoundingBox } from "@skylens-aviation/core";

/** Congestion score for a region */
export interface CongestionScore {
  bbox: BoundingBox;
  score: number;
  aircraftCount: number;
  density: number;
}

/** Compute congestion scores for multiple regions */
export function computeCongestion(
  states: StateVector[],
  regions: BoundingBox[],
): CongestionScore[] {
  return regions.map((bbox) => {
    const inRegion = states.filter(
      (s) =>
        s.latitude >= bbox.minLat &&
        s.latitude <= bbox.maxLat &&
        s.longitude >= bbox.minLon &&
        s.longitude <= bbox.maxLon,
    );

    const areaDegreeSq =
      (bbox.maxLat - bbox.minLat) * (bbox.maxLon - bbox.minLon);
    const density = areaDegreeSq > 0 ? inRegion.length / areaDegreeSq : 0;

    // Score: normalized density (aircraft per square degree)
    // Higher = more congested
    return {
      bbox,
      score: density,
      aircraftCount: inRegion.length,
      density,
    };
  });
}

/** Compute congestion over time for a single region */
export function congestionTimeSeries(
  states: StateVector[],
  region: BoundingBox,
  intervalSec: number,
): { time: number; score: number }[] {
  if (states.length === 0) return [];

  const sorted = [...states].sort((a, b) => a.timestamp - b.timestamp);
  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const series: { time: number; score: number }[] = [];

  const areaDegSq =
    (region.maxLat - region.minLat) * (region.maxLon - region.minLon);

  for (let t = startTime; t <= endTime; t += intervalSec) {
    const windowEnd = t + intervalSec;
    const inWindow = sorted.filter(
      (s) =>
        s.timestamp >= t &&
        s.timestamp < windowEnd &&
        s.latitude >= region.minLat &&
        s.latitude <= region.maxLat &&
        s.longitude >= region.minLon &&
        s.longitude <= region.maxLon,
    );

    // Count unique aircraft in window
    const uniqueAircraft = new Set(inWindow.map((s) => s.icao24));
    const density = areaDegSq > 0 ? uniqueAircraft.size / areaDegSq : 0;

    series.push({ time: t, score: density });
  }

  return series;
}
