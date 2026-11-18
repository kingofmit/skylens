import { FlightTrack, PhaseSegment } from "@skylens-aviation/core";
import { haversineDistance } from "@skylens-aviation/core";

/** Input for a flight report */
export interface FlightReport {
  track: FlightTrack;
  phases?: PhaseSegment[];
  metrics?: Record<string, number>;
}

/** Structured report data for PDF rendering */
export interface FlightReportData {
  summary: {
    icao24: string;
    callsign: string | null;
    origin: string | null;
    destination: string | null;
    durationSeconds: number;
    totalDistanceM: number;
    maxAltitudeFt: number;
    maxSpeedKts: number;
    stateCount: number;
  };
  phases: {
    phase: string;
    durationSeconds: number;
    percentage: number;
  }[];
  statistics: Record<string, number>;
  path: { lat: number; lon: number; altFt: number; time: number }[];
}

/** Generate structured report data from a flight report */
export function generateReportData(report: FlightReport): FlightReportData {
  const { track, phases, metrics } = report;
  const { states } = track;

  // Summary
  let totalDistanceM = 0;
  let maxAltitudeFt = 0;
  let maxSpeedKts = 0;

  for (let i = 0; i < states.length; i++) {
    if (states[i].altitudeFt > maxAltitudeFt) maxAltitudeFt = states[i].altitudeFt;
    if (states[i].groundSpeedKts > maxSpeedKts) maxSpeedKts = states[i].groundSpeedKts;
    if (i > 0) {
      totalDistanceM += haversineDistance(
        states[i - 1].latitude, states[i - 1].longitude,
        states[i].latitude, states[i].longitude,
      );
    }
  }

  const durationSeconds = states.length >= 2
    ? states[states.length - 1].timestamp - states[0].timestamp
    : 0;

  const summary = {
    icao24: track.icao24,
    callsign: track.callsign,
    origin: track.origin,
    destination: track.destination,
    durationSeconds,
    totalDistanceM,
    maxAltitudeFt,
    maxSpeedKts,
    stateCount: states.length,
  };

  // Phase breakdown
  const phaseData: FlightReportData["phases"] = [];
  if (phases && phases.length > 0) {
    for (const p of phases) {
      const phaseDuration = p.endTime - p.startTime;
      phaseData.push({
        phase: p.phase,
        durationSeconds: phaseDuration,
        percentage: durationSeconds > 0 ? (phaseDuration / durationSeconds) * 100 : 0,
      });
    }
  }

  // Path coordinates
  const path = states.map((s) => ({
    lat: s.latitude,
    lon: s.longitude,
    altFt: s.altitudeFt,
    time: s.timestamp,
  }));

  return {
    summary,
    phases: phaseData,
    statistics: metrics ?? {},
    path,
  };
}
