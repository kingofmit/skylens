import { useMemo } from "react";
import type { FlightTrack } from "@skylens-aviation/core";
import { haversineDistance } from "@skylens-aviation/core";
import { detectFlightPhases } from "@skylens-aviation/ingest";
import { PHASE_COLORS } from "../../lib/colors";

interface Props {
  tracks: FlightTrack[];
  selectedFlight: string | null;
  onSelectFlight: (id: string) => void;
}

const M_TO_NM = 0.000539957;

interface FlightSummary {
  icao24: string;
  callsign: string | null;
  phases: string[];
  distanceNm: number;
  durationMin: number;
}

export function FlightListPanel({ tracks, selectedFlight, onSelectFlight }: Props) {
  const summaries = useMemo<FlightSummary[]>(() => {
    return tracks.map((track) => {
      const phases = detectFlightPhases(track);
      const phaseNames = [...new Set(phases.map((p) => p.phase))];

      const { states } = track;
      let distanceNm = 0;
      let durationMin = 0;

      if (states.length >= 2) {
        distanceNm =
          haversineDistance(
            states[0].latitude,
            states[0].longitude,
            states[states.length - 1].latitude,
            states[states.length - 1].longitude,
          ) * M_TO_NM;

        durationMin = (states[states.length - 1].timestamp - states[0].timestamp) / 60;
      }

      return {
        icao24: track.icao24,
        callsign: track.callsign,
        phases: phaseNames,
        distanceNm,
        durationMin,
      };
    });
  }, [tracks]);

  return (
    <div className="space-y-1">
      <h3 className="text-cyan-400 text-xs uppercase tracking-widest font-semibold px-1 mb-2">
        Flights ({tracks.length})
      </h3>
      {summaries.map((s) => {
        const isSelected = selectedFlight === s.icao24;
        return (
          <button
            key={s.icao24}
            onClick={() => onSelectFlight(s.icao24)}
            className={`w-full text-left px-3 py-2 rounded-lg tab-transition ${
              isSelected
                ? "bg-cyan-500/20 border border-cyan-500/30 border-glow-animate"
                : "bg-white/5 hover:bg-white/10 border border-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold text-sm">
                {s.callsign ?? s.icao24}
              </span>
              <span className="text-xs text-gray-400 font-mono">{s.icao24}</span>
            </div>

            <div className="flex items-center gap-1 mt-1">
              {s.phases.map((phase) => (
                <span
                  key={phase}
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PHASE_COLORS[phase] ?? "#6b7280" }}
                  title={phase}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              <span className="text-orange-400 font-mono">{s.distanceNm.toFixed(0)} nm</span>
              <span className="text-orange-400 font-mono">{s.durationMin.toFixed(0)} min</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
