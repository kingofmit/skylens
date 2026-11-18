import { FlightTrack, TimeRange } from "@skylens/core";
import { haversineDistance, bearing } from "@skylens/core";

/** Runway physical definition */
export interface RunwayDefinition {
  name: string;
  thresholdLat: number;
  thresholdLon: number;
  headingDeg: number;
  lengthM: number;
}

/** A detected runway event (arrival or departure) */
export interface RunwayEvent {
  icao24: string;
  callsign: string | null;
  runway: string;
  type: "departure" | "arrival";
  time: number;
}

/** Utilization statistics for a runway */
export interface RunwayUtilizationStats {
  arrivals: number;
  departures: number;
  operations: number;
}

/** Detect runway events (takeoffs and landings) from flight tracks */
export function detectRunwayEvents(
  tracks: FlightTrack[],
  runways: RunwayDefinition[],
): RunwayEvent[] {
  const events: RunwayEvent[] = [];

  for (const track of tracks) {
    const { states } = track;
    for (let i = 1; i < states.length; i++) {
      const prev = states[i - 1];
      const curr = states[i];

      // Departure: ground → air transition
      if (prev.onGround && !curr.onGround) {
        const runway = matchRunway(curr.latitude, curr.longitude, curr.trackDeg, runways);
        if (runway) {
          events.push({
            icao24: track.icao24,
            callsign: track.callsign,
            runway: runway.name,
            type: "departure",
            time: curr.timestamp,
          });
        }
      }

      // Arrival: air → ground transition
      if (!prev.onGround && curr.onGround) {
        const runway = matchRunway(curr.latitude, curr.longitude, prev.trackDeg, runways);
        if (runway) {
          events.push({
            icao24: track.icao24,
            callsign: track.callsign,
            runway: runway.name,
            type: "arrival",
            time: curr.timestamp,
          });
        }
      }
    }
  }

  events.sort((a, b) => a.time - b.time);
  return events;
}

/** Compute runway utilization counts within a time range */
export function runwayUtilization(
  events: RunwayEvent[],
  timeRange: TimeRange,
): Map<string, RunwayUtilizationStats> {
  const result = new Map<string, RunwayUtilizationStats>();

  for (const event of events) {
    if (event.time < timeRange.start || event.time > timeRange.end) continue;
    let stats = result.get(event.runway);
    if (!stats) {
      stats = { arrivals: 0, departures: 0, operations: 0 };
      result.set(event.runway, stats);
    }
    if (event.type === "arrival") stats.arrivals++;
    else stats.departures++;
    stats.operations++;
  }

  return result;
}

function matchRunway(
  lat: number,
  lon: number,
  trackDeg: number,
  runways: RunwayDefinition[],
  maxDistanceM: number = 2000,
  maxHeadingDiff: number = 30,
): RunwayDefinition | null {
  let best: RunwayDefinition | null = null;
  let bestDist = Infinity;

  for (const rwy of runways) {
    const dist = haversineDistance(lat, lon, rwy.thresholdLat, rwy.thresholdLon);
    if (dist > maxDistanceM) continue;

    let headingDiff = Math.abs(trackDeg - rwy.headingDeg);
    if (headingDiff > 180) headingDiff = 360 - headingDiff;
    // Allow both directions of runway
    const reverseHeadingDiff = Math.abs(trackDeg - ((rwy.headingDeg + 180) % 360));
    const effectiveDiff = Math.min(headingDiff, reverseHeadingDiff > 180 ? 360 - reverseHeadingDiff : reverseHeadingDiff);

    if (effectiveDiff > maxHeadingDiff) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = rwy;
    }
  }

  return best;
}
