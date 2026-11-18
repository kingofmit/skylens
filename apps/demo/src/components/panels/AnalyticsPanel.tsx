import { useMemo, useState } from "react";
import type { SyntheticData } from "../../data/synthetic";
import {
  mapHealthToColor,
  mapAnomalyToEventMarkers,
  StateVectorBuffer,
  toMercator,
  fromMercator,
} from "@skylens-aviation/core";
import { findContainingSectors } from "@skylens-aviation/airspace";
import { computeCongestion } from "@skylens-aviation/heatmap";
import { sectorDensity } from "@skylens-aviation/heatmap";
import { PerformanceEnvelopeChart } from "../charts/PerformanceEnvelopeChart";
import { CongestionChart } from "../charts/CongestionChart";

interface Props {
  data: SyntheticData;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(11, 19) + "Z";
}

function colorToCss(c: { r: number; g: number; b: number }): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
}

export function AnalyticsPanel({ data }: Props) {
  const [envelopeParam, setEnvelopeParam] = useState("EGT");

  const { metrics } = data.flightDNAMetrics.length > 0
    ? { metrics: data.flightDNAMetrics }
    : { metrics: [] };

  // Health badges
  const healthBadges = useMemo(
    () =>
      metrics.map((m) => ({
        time: m.timestamp,
        score: m.healthScore,
        color: mapHealthToColor(m.healthScore),
      })),
    [metrics],
  );

  // Anomaly events
  const anomalyMarkers = useMemo(
    () => mapAnomalyToEventMarkers(metrics),
    [metrics],
  );

  // All state vectors
  const allStates = useMemo(
    () => data.tracks.flatMap((t) => t.states),
    [data.tracks],
  );

  // Congestion scores
  const congestionScores = useMemo(
    () => computeCongestion(allStates, data.congestionRegions),
    [allStates, data.congestionRegions],
  );

  // Sector density
  const sectorCounts = useMemo(
    () => sectorDensity(allStates, data.airspaceBoundaries),
    [allStates, data.airspaceBoundaries],
  );

  // Typed array round-trip demo
  const typedArrayDemo = useMemo(() => {
    const states = allStates.slice(0, 1000);
    const t0 = performance.now();
    const buffer = StateVectorBuffer.fromStateVectors(states);
    const roundTrip = buffer.toStateVectors();
    const elapsed = performance.now() - t0;
    return { input: states.length, output: roundTrip.length, elapsedMs: elapsed };
  }, [allStates]);

  // Mercator round-trip demo
  const mercatorDemo = useMemo(() => {
    const lat = 40.6413;
    const lon = -73.7781;
    const proj = toMercator(lat, lon);
    const inv = fromMercator(proj.x, proj.y);
    return { original: { lat, lon }, projected: proj, inverted: inv };
  }, []);

  // Point-in-polygon demo
  const pipDemo = useMemo(() => {
    const lat = 40.5;
    const lon = -73.5;
    const altFl = 350;
    const sectors = findContainingSectors(lat, lon, altFl, data.airspaceBoundaries);
    return { lat, lon, altFl, sectors };
  }, [data.airspaceBoundaries]);

  // Available envelope params
  const envelopeParams = useMemo(() => {
    const params = new Set<string>();
    for (const m of metrics) {
      for (const e of m.performanceEnvelope) params.add(e.param);
    }
    return Array.from(params);
  }, [metrics]);

  return (
    <div className="space-y-5 text-sm">
      <h3 className="text-lg font-semibold text-neon-cyan">Analytics</h3>

      {/* FlightDNA Health */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">FlightDNA Health</h4>
        <div className="flex flex-wrap gap-1">
          {healthBadges.map((h, i) => (
            <span
              key={i}
              className="inline-block w-6 h-6 rounded text-[10px] leading-6 text-center font-mono font-semibold"
              style={{ backgroundColor: colorToCss(h.color), color: h.score < 0.5 ? "#fff" : "#000" }}
              title={`${formatTime(h.time)}: ${h.score.toFixed(2)}`}
            >
              {(h.score * 100).toFixed(0)}
            </span>
          ))}
        </div>
      </section>

      {/* Anomaly Events */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">
          Anomaly Events ({anomalyMarkers.length})
        </h4>
        {anomalyMarkers.length === 0 ? (
          <p className="text-gray-500 text-xs">No anomalies</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {anomalyMarkers.map((m, i) => (
              <div key={i} className="bg-white/5 rounded px-2 py-1 text-xs flex justify-between border border-cyan-500/10">
                <span className="text-red-400 font-mono">{m.label}</span>
                <span className="text-gray-500 font-mono">{formatTime(m.time)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Performance Envelope */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold">Performance Envelope</h4>
          <select
            value={envelopeParam}
            onChange={(e) => setEnvelopeParam(e.target.value)}
            className="bg-white/5 text-white text-xs rounded px-2 py-0.5 border border-cyan-500/20"
          >
            {envelopeParams.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <PerformanceEnvelopeChart metrics={metrics} param={envelopeParam} />
      </section>

      {/* Congestion Scores */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Congestion Scores</h4>
        <div className="space-y-1">
          {congestionScores.map((cs, i) => (
            <div key={i} className="bg-white/5 rounded px-3 py-2 flex justify-between items-center border border-cyan-500/10">
              <span className="text-gray-300 text-xs">
                Region {i + 1}: {cs.bbox.minLat.toFixed(1)}-{cs.bbox.maxLat.toFixed(1)}N,{" "}
                {cs.bbox.minLon.toFixed(1)}-{cs.bbox.maxLon.toFixed(1)}E
              </span>
              <div className="text-right">
                <span className="text-orange-400 font-mono text-sm">{cs.aircraftCount}</span>
                <span className="text-xs text-gray-500 ml-1">aircraft</span>
                <span className="text-xs text-cyan-400 ml-2">score: {cs.score.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Congestion Time Series */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Congestion Over Time</h4>
        <CongestionChart states={allStates} regions={data.congestionRegions} />
      </section>

      {/* Sector Density */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Sector Density</h4>
        <div className="grid grid-cols-3 gap-2">
          {data.airspaceBoundaries.map((b) => (
            <div key={b.id} className="bg-white/5 rounded p-2 text-center border border-cyan-500/10">
              <span className="text-xs text-gray-400 block">{b.name}</span>
              <span className="text-orange-400 font-mono text-lg">{sectorCounts.get(b.id) ?? 0}</span>
              <span className="text-xs text-gray-500 block">aircraft</span>
            </div>
          ))}
        </div>
      </section>

      {/* Typed Array Demo */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Typed Array Round-Trip</h4>
        <div className="bg-white/5 rounded p-3 text-xs font-mono space-y-1 border border-cyan-500/10">
          <p>Input: <span className="text-orange-400">{typedArrayDemo.input}</span> state vectors</p>
          <p>Output: <span className="text-orange-400">{typedArrayDemo.output}</span> state vectors</p>
          <p>Time: <span className="text-orange-400">{typedArrayDemo.elapsedMs.toFixed(2)}ms</span></p>
          <p className={typedArrayDemo.input === typedArrayDemo.output ? "text-green-400" : "text-red-400"}>
            {typedArrayDemo.input === typedArrayDemo.output ? "Round-trip OK" : "MISMATCH"}
          </p>
        </div>
      </section>

      {/* Mercator Demo */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Mercator Round-Trip</h4>
        <div className="bg-white/5 rounded p-3 text-xs font-mono space-y-1 border border-cyan-500/10">
          <p>
            Original: <span className="text-orange-400">{mercatorDemo.original.lat.toFixed(6)}, {mercatorDemo.original.lon.toFixed(6)}</span>
          </p>
          <p>
            Projected: <span className="text-orange-400">x={mercatorDemo.projected.x.toFixed(2)}, y={mercatorDemo.projected.y.toFixed(2)}</span>
          </p>
          <p>
            Inverted: <span className="text-orange-400">{mercatorDemo.inverted.lat.toFixed(6)}, {mercatorDemo.inverted.lon.toFixed(6)}</span>
          </p>
          <p
            className={
              Math.abs(mercatorDemo.original.lat - mercatorDemo.inverted.lat) < 0.0001
                ? "text-green-400"
                : "text-red-400"
            }
          >
            {Math.abs(mercatorDemo.original.lat - mercatorDemo.inverted.lat) < 0.0001
              ? "Round-trip OK"
              : "MISMATCH"}
          </p>
        </div>
      </section>

      {/* Point-in-Polygon */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Point-in-Polygon Check</h4>
        <div className="bg-white/5 rounded p-3 text-xs font-mono space-y-1 border border-cyan-500/10">
          <p>
            Point: <span className="text-orange-400">{pipDemo.lat.toFixed(2)}, {pipDemo.lon.toFixed(2)} @ FL{pipDemo.altFl}</span>
          </p>
          <p>Containing sectors: <span className="text-orange-400">{pipDemo.sectors.length}</span></p>
          {pipDemo.sectors.map((s) => (
            <p key={s.id} className="text-cyan-400 ml-2">
              {s.name} ({s.id})
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
