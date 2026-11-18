import { Color, EventMarker } from "./types";

/** FlightDNA health and performance metrics for a single time point */
export interface FlightDNAMetrics {
  icao24: string;
  timestamp: number;
  healthScore: number;
  anomalyFlags: string[];
  performanceEnvelope: {
    param: string;
    value: number;
    min: number;
    max: number;
  }[];
}

/** Overlay configuration for rendering FlightDNA data on a flight path */
export interface FlightDNAOverlay {
  trackId: string;
  metrics: FlightDNAMetrics[];
  colorMapping: (metric: FlightDNAMetrics) => Color;
}

/** Map a health score (0.0–1.0) to a color: red → yellow → green */
export function mapHealthToColor(healthScore: number): Color {
  const h = Math.max(0, Math.min(1, healthScore));
  if (h < 0.5) {
    // Red (0.0) → Yellow (0.5)
    const t = h / 0.5;
    return { r: 255, g: Math.round(255 * t), b: 0, a: 1 };
  }
  // Yellow (0.5) → Green (1.0)
  const t = (h - 0.5) / 0.5;
  return { r: Math.round(255 * (1 - t)), g: 255, b: 0, a: 1 };
}

/** Convert FlightDNA anomaly flags to replay EventMarkers */
export function mapAnomalyToEventMarkers(metrics: FlightDNAMetrics[]): EventMarker[] {
  const markers: EventMarker[] = [];
  for (const m of metrics) {
    for (const flag of m.anomalyFlags) {
      markers.push({
        time: m.timestamp,
        type: "flightdna_anomaly",
        label: flag,
        data: {
          icao24: m.icao24,
          healthScore: m.healthScore,
          anomalyFlag: flag,
        },
      });
    }
  }
  return markers;
}

/** Build a time series of a performance envelope parameter for chart rendering */
export function buildPerformanceEnvelopeProfile(
  metrics: FlightDNAMetrics[],
  param: string,
): { time: number; value: number; min: number; max: number }[] {
  const result: { time: number; value: number; min: number; max: number }[] = [];
  for (const m of metrics) {
    const envelope = m.performanceEnvelope.find((e) => e.param === param);
    if (envelope) {
      result.push({
        time: m.timestamp,
        value: envelope.value,
        min: envelope.min,
        max: envelope.max,
      });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}
