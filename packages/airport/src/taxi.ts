import { haversineDistance } from "@skylens-aviation/core";
import { SurfaceTrack } from "./surface";
import { RunwayEvent } from "./runway";

/** Taxi metrics for a single aircraft */
export interface TaxiMetrics {
  icao24: string;
  callsign: string | null;
  gateToRunwaySeconds: number | null;
  runwayToGateSeconds: number | null;
  taxiDistanceM: number;
}

/** Aggregate taxi time statistics */
export interface TaxiStatistics {
  mean: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
}

/** Compute taxi metrics for a single aircraft from surface track and runway events */
export function computeTaxiMetrics(
  surfaceTrack: SurfaceTrack,
  runwayEvents: RunwayEvent[],
): TaxiMetrics {
  const { positions, icao24, callsign } = surfaceTrack;

  // Total taxi distance
  let taxiDistanceM = 0;
  for (let i = 1; i < positions.length; i++) {
    if (
      positions[i].classification === "taxi" ||
      positions[i - 1].classification === "taxi"
    ) {
      taxiDistanceM += haversineDistance(
        positions[i - 1].lat,
        positions[i - 1].lon,
        positions[i].lat,
        positions[i].lon,
      );
    }
  }

  const aircraftEvents = runwayEvents.filter((e) => e.icao24 === icao24);

  // Gate → Runway: time from first gate classification to departure event
  let gateToRunwaySeconds: number | null = null;
  const departure = aircraftEvents.find((e) => e.type === "departure");
  if (departure) {
    const gatePositions = positions.filter((p) => p.classification === "gate");
    const lastGate = gatePositions.filter((p) => p.timestamp < departure.time).pop();
    if (lastGate) {
      gateToRunwaySeconds = departure.time - lastGate.timestamp;
    }
  }

  // Runway → Gate: time from arrival event to first gate classification
  let runwayToGateSeconds: number | null = null;
  const arrival = aircraftEvents.find((e) => e.type === "arrival");
  if (arrival) {
    const gateAfterArrival = positions.find(
      (p) => p.classification === "gate" && p.timestamp > arrival.time,
    );
    if (gateAfterArrival) {
      runwayToGateSeconds = gateAfterArrival.timestamp - arrival.time;
    }
  }

  return {
    icao24,
    callsign,
    gateToRunwaySeconds,
    runwayToGateSeconds,
    taxiDistanceM,
  };
}

/** Compute aggregate statistics from a collection of taxi metrics */
export function taxiTimeStatistics(metrics: TaxiMetrics[]): TaxiStatistics {
  const times: number[] = [];
  for (const m of metrics) {
    if (m.gateToRunwaySeconds != null) times.push(m.gateToRunwaySeconds);
    if (m.runwayToGateSeconds != null) times.push(m.runwayToGateSeconds);
  }

  if (times.length === 0) return { mean: 0, median: 0, p90: 0, p95: 0, max: 0 };

  times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    mean: sum / times.length,
    median: percentile(times, 0.5),
    p90: percentile(times, 0.9),
    p95: percentile(times, 0.95),
    max: times[times.length - 1],
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
