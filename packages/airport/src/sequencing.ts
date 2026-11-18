import { RunwayEvent } from "./runway";

/** A single entry in an arrival/departure sequence */
export interface SequenceEntry {
  icao24: string;
  callsign: string | null;
  type: "arrival" | "departure";
  sequenceNumber: number;
  time: number;
  runway: string;
}

/** Spacing statistics */
export interface SpacingStatistics {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
}

/** Build a time-ordered arrival sequence from runway events */
export function buildArrivalSequence(events: RunwayEvent[]): SequenceEntry[] {
  return buildSequence(events.filter((e) => e.type === "arrival"), "arrival");
}

/** Build a time-ordered departure sequence from runway events */
export function buildDepartureSequence(events: RunwayEvent[]): SequenceEntry[] {
  return buildSequence(events.filter((e) => e.type === "departure"), "departure");
}

/** Compute inter-arrival/departure time statistics */
export function interArrivalTime(sequence: SequenceEntry[]): SpacingStatistics {
  if (sequence.length < 2) return { mean: 0, min: 0, max: 0, stdDev: 0 };

  const gaps: number[] = [];
  for (let i = 1; i < sequence.length; i++) {
    gaps.push(sequence[i].time - sequence[i - 1].time);
  }

  const sum = gaps.reduce((a, b) => a + b, 0);
  const mean = sum / gaps.length;
  const min = Math.min(...gaps);
  const max = Math.max(...gaps);
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;

  return { mean, min, max, stdDev: Math.sqrt(variance) };
}

function buildSequence(
  events: RunwayEvent[],
  type: "arrival" | "departure",
): SequenceEntry[] {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  return sorted.map((e, i) => ({
    icao24: e.icao24,
    callsign: e.callsign,
    type,
    sequenceNumber: i + 1,
    time: e.time,
    runway: e.runway,
  }));
}
