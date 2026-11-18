import { FlightTrack } from "@skylens/core";
import { haversineDistance } from "@skylens/core";

/** Detected holding pattern */
export interface HoldingPattern {
  centerLat: number;
  centerLon: number;
  startTime: number;
  endTime: number;
  orbits: number;
  legLengthM: number;
}

/** Detect holding patterns (racetrack orbits) in a flight track */
export function detectHoldingPatterns(
  track: FlightTrack,
  options?: {
    minOrbitDeg?: number;
    minOrbits?: number;
    windowSize?: number;
  },
): HoldingPattern[] {
  const minOrbitDeg = options?.minOrbitDeg ?? 270;
  const minOrbits = options?.minOrbits ?? 1;
  const windowSize = options?.windowSize ?? 60;
  const { states } = track;
  const patterns: HoldingPattern[] = [];

  if (states.length < windowSize) return patterns;

  let i = 0;
  while (i < states.length - windowSize) {
    // Check for cumulative heading change in the window
    const result = measureOrbit(states, i, windowSize, minOrbitDeg);

    if (result) {
      // Found start of potential hold — extend to find full pattern
      const hold = extendHold(states, i, windowSize, minOrbitDeg, minOrbits);
      if (hold && hold.orbits >= minOrbits) {
        patterns.push(hold);
        i = hold.endIndex + 1;
        continue;
      }
    }
    i++;
  }

  return patterns;
}

function measureOrbit(
  states: FlightTrack["states"],
  startIdx: number,
  windowSize: number,
  minDeg: number,
): boolean {
  let totalHeadingChange = 0;
  const end = Math.min(startIdx + windowSize, states.length);

  for (let i = startIdx + 1; i < end; i++) {
    let delta = states[i].trackDeg - states[i - 1].trackDeg;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    totalHeadingChange += delta;
  }

  return Math.abs(totalHeadingChange) >= minDeg;
}

function extendHold(
  states: FlightTrack["states"],
  startIdx: number,
  windowSize: number,
  minOrbitDeg: number,
  minOrbits: number,
): (HoldingPattern & { endIndex: number }) | null {
  let totalHeadingChange = 0;
  let endIdx = startIdx;
  let sumLat = 0;
  let sumLon = 0;
  let count = 0;

  for (let i = startIdx + 1; i < states.length; i++) {
    let delta = states[i].trackDeg - states[i - 1].trackDeg;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    totalHeadingChange += delta;
    sumLat += states[i].latitude;
    sumLon += states[i].longitude;
    count++;
    endIdx = i;

    // Check if we've stopped turning (straight flight > 30 seconds)
    if (i > startIdx + windowSize) {
      let recentChange = 0;
      const lookback = Math.min(20, i - startIdx);
      for (let j = i - lookback + 1; j <= i; j++) {
        let d = states[j].trackDeg - states[j - 1].trackDeg;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        recentChange += d;
      }
      if (Math.abs(recentChange) < 30) break;
    }
  }

  const orbits = Math.abs(totalHeadingChange) / 360;
  if (orbits < minOrbits) return null;

  const centerLat = sumLat / count;
  const centerLon = sumLon / count;

  // Estimate leg length as average distance from center
  let totalDist = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    totalDist += haversineDistance(centerLat, centerLon, states[i].latitude, states[i].longitude);
  }
  const legLengthM = (totalDist / (endIdx - startIdx + 1)) * 2;

  return {
    centerLat,
    centerLon,
    startTime: states[startIdx].timestamp,
    endTime: states[endIdx].timestamp,
    orbits: Math.floor(orbits),
    legLengthM,
    endIndex: endIdx,
  };
}
