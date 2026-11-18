import { useMemo } from "react";
import type { FlightTrack, WaypointFix, AirspaceBoundary } from "@skylens-aviation/core";
import { haversineDistance, bearing, SpatialIndex } from "@skylens-aviation/core";
import { detectFlightPhases } from "@skylens-aviation/ingest";
import { detectHoldingPatterns, annotateWaypoints } from "@skylens-aviation/paths";
import { PHASE_COLORS } from "../../lib/colors";
import { AltitudeProfileChart } from "../charts/AltitudeProfileChart";

interface Props {
  track: FlightTrack;
  waypointFixes: WaypointFix[];
  allTracks: FlightTrack[];
  boundaries: AirspaceBoundary[];
}

const M_TO_NM = 0.000539957;

function formatTime(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(11, 19) + "Z";
}

export function FlightDetailPanel({ track, waypointFixes, allTracks, boundaries }: Props) {
  const phases = useMemo(() => detectFlightPhases(track), [track]);
  const holdingPatterns = useMemo(() => detectHoldingPatterns(track), [track]);
  const waypoints = useMemo(
    () => annotateWaypoints(track, waypointFixes),
    [track, waypointFixes],
  );

  const { states } = track;
  const first = states[0];
  const last = states[states.length - 1];

  const directDistNm = first && last
    ? haversineDistance(first.latitude, first.longitude, last.latitude, last.longitude) * M_TO_NM
    : 0;

  const bearingDeg = first && last
    ? bearing(first.latitude, first.longitude, last.latitude, last.longitude)
    : 0;

  // Actual distance (sum of segments)
  const actualDistNm = useMemo(() => {
    let d = 0;
    for (let i = 1; i < states.length; i++) {
      d += haversineDistance(
        states[i - 1].latitude, states[i - 1].longitude,
        states[i].latitude, states[i].longitude,
      );
    }
    return d * M_TO_NM;
  }, [states]);

  // Spatial index: aircraft within 50nm of midpoint
  const nearbyCount = useMemo(() => {
    if (states.length === 0) return 0;
    const midIdx = Math.floor(states.length / 2);
    const mid = states[midIdx];
    const index = new SpatialIndex(0.5);
    for (const t of allTracks) {
      for (const s of t.states) {
        index.insert(`${t.icao24}_${s.timestamp}`, s.latitude, s.longitude);
      }
    }
    const radiusM = 50 * 1852; // 50nm in meters
    return index.queryRadius(mid.latitude, mid.longitude, radiusM).length;
  }, [states, allTracks]);

  // Phase timeline total duration
  const totalDuration = phases.length > 0
    ? phases[phases.length - 1].endTime - phases[0].startTime
    : 1;

  return (
    <div className="space-y-4 text-sm">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-neon-cyan">{track.callsign ?? track.icao24}</h3>
        <p className="text-xs text-gray-400 font-mono">{track.icao24}</p>
        {(track.origin || track.destination) && (
          <p className="text-gray-300 mt-1">
            {track.origin ?? "?"} &rarr; {track.destination ?? "?"}
          </p>
        )}
      </div>

      {/* Phase Timeline Bar */}
      <div>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-1">Phase Timeline</h4>
        <div className="flex h-4 rounded overflow-hidden">
          {phases.map((seg, i) => {
            const width = ((seg.endTime - seg.startTime) / totalDuration) * 100;
            return (
              <div
                key={i}
                className="h-full"
                style={{
                  width: `${Math.max(width, 1)}%`,
                  backgroundColor: PHASE_COLORS[seg.phase] ?? "#6b7280",
                }}
                title={`${seg.phase} (${formatTime(seg.startTime)} - ${formatTime(seg.endTime)})`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {phases.map((seg, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-300">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: PHASE_COLORS[seg.phase] ?? "#6b7280" }}
              />
              {seg.phase}
              <span className="text-gray-500">
                {((seg.endTime - seg.startTime) / 60).toFixed(0)}m
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Altitude Profile */}
      <div>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-1">Altitude Profile</h4>
        <AltitudeProfileChart track={track} />
      </div>

      {/* Distance & Bearing */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2 border border-cyan-500/10">
          <span className="text-xs text-gray-400">Direct Distance</span>
          <p className="text-orange-400 font-mono">{directDistNm.toFixed(1)} nm</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-cyan-500/10">
          <span className="text-xs text-gray-400">Bearing</span>
          <p className="text-orange-400 font-mono">{bearingDeg.toFixed(1)}&deg;</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-cyan-500/10">
          <span className="text-xs text-gray-400">Actual Distance</span>
          <p className="text-orange-400 font-mono">{actualDistNm.toFixed(1)} nm</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2 border border-cyan-500/10">
          <span className="text-xs text-gray-400">Efficiency</span>
          <p className="text-orange-400 font-mono">
            {actualDistNm > 0 ? ((directDistNm / actualDistNm) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Holding Patterns */}
      <div>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-1">
          Holding Patterns ({holdingPatterns.length})
        </h4>
        {holdingPatterns.length === 0 ? (
          <p className="text-gray-500 text-xs">None detected</p>
        ) : (
          <div className="space-y-1">
            {holdingPatterns.map((h, i) => (
              <div key={i} className="bg-white/5 rounded px-2 py-1 text-xs border border-cyan-500/10">
                <span className="text-gray-300">
                  {h.orbits} orbit{h.orbits !== 1 ? "s" : ""} at{" "}
                  {h.centerLat.toFixed(2)}, {h.centerLon.toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2">
                  {formatTime(h.startTime)} - {formatTime(h.endTime)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waypoints */}
      <div>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-1">
          Waypoints Matched ({waypoints.length})
        </h4>
        {waypoints.length === 0 ? (
          <p className="text-gray-500 text-xs">None within threshold</p>
        ) : (
          <div className="space-y-1">
            {waypoints.map((w, i) => (
              <div key={i} className="bg-white/5 rounded px-2 py-1 text-xs flex justify-between border border-cyan-500/10">
                <span className="font-mono text-gray-200">{w.fix.name}</span>
                <span className="text-orange-400 font-mono">
                  {(w.distanceM * M_TO_NM).toFixed(1)} nm
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spatial Index */}
      <div className="bg-white/5 rounded-lg p-2 border border-cyan-500/10">
        <span className="text-xs text-gray-400">Aircraft within 50nm (midpoint)</span>
        <p className="text-orange-400 font-mono">{nearbyCount} state vectors</p>
      </div>
    </div>
  );
}
