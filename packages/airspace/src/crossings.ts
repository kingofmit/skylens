import { FlightTrack, AirspaceBoundary } from "@skylens/core";
import { pointInPolygon } from "./geometry";

/** A detected sector crossing event */
export interface SectorCrossing {
  boundary: AirspaceBoundary;
  entryTime: number;
  exitTime: number;
  entryPoint: { lat: number; lon: number };
  exitPoint: { lat: number; lon: number };
}

/** Detect all sector crossings for a flight track */
export function detectSectorCrossings(
  track: FlightTrack,
  boundaries: AirspaceBoundary[],
): SectorCrossing[] {
  const crossings: SectorCrossing[] = [];
  const { states } = track;
  if (states.length === 0) return crossings;

  // Track which boundaries the aircraft is currently inside
  const activeEntries = new Map<
    string,
    { boundary: AirspaceBoundary; entryTime: number; entryPoint: { lat: number; lon: number } }
  >();

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    const altFl = s.altitudeFt / 100;

    for (const boundary of boundaries) {
      const inside = pointInPolygon(s.latitude, s.longitude, boundary.polygon) &&
        (!boundary.altRange || (altFl >= boundary.altRange.minFl && altFl <= boundary.altRange.maxFl));

      const wasInside = activeEntries.has(boundary.id);

      if (inside && !wasInside) {
        activeEntries.set(boundary.id, {
          boundary,
          entryTime: s.timestamp,
          entryPoint: { lat: s.latitude, lon: s.longitude },
        });
      } else if (!inside && wasInside) {
        const entry = activeEntries.get(boundary.id)!;
        crossings.push({
          boundary: entry.boundary,
          entryTime: entry.entryTime,
          exitTime: s.timestamp,
          entryPoint: entry.entryPoint,
          exitPoint: { lat: s.latitude, lon: s.longitude },
        });
        activeEntries.delete(boundary.id);
      }
    }
  }

  // Close any still-active crossings at end of track
  const lastState = states[states.length - 1];
  for (const entry of activeEntries.values()) {
    crossings.push({
      boundary: entry.boundary,
      entryTime: entry.entryTime,
      exitTime: lastState.timestamp,
      entryPoint: entry.entryPoint,
      exitPoint: { lat: lastState.latitude, lon: lastState.longitude },
    });
  }

  crossings.sort((a, b) => a.entryTime - b.entryTime);
  return crossings;
}

/** Compute total dwell time (seconds) per sector */
export function computeDwellTimes(crossings: SectorCrossing[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const c of crossings) {
    const current = result.get(c.boundary.id) ?? 0;
    result.set(c.boundary.id, current + (c.exitTime - c.entryTime));
  }
  return result;
}

/** Get ordered sequence of sector transitions */
export function sectorTransitionSequence(
  crossings: SectorCrossing[],
): { sectorId: string; entryTime: number }[] {
  return crossings
    .slice()
    .sort((a, b) => a.entryTime - b.entryTime)
    .map((c) => ({ sectorId: c.boundary.id, entryTime: c.entryTime }));
}
