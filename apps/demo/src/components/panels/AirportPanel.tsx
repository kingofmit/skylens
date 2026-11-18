import { useMemo } from "react";
import type { SyntheticData } from "../../data/synthetic";
import type { Airport } from "@skylens-aviation/core";
import {
  extractSurfaceMovement,
  classifyMovement,
  detectRunwayEvents,
  runwayUtilization,
  computeTaxiMetrics,
  taxiTimeStatistics,
  inferGateAssignments,
  buildArrivalSequence,
  buildDepartureSequence,
  interArrivalTime,
} from "@skylens-aviation/airport";
import { RunwayUtilChart } from "../charts/RunwayUtilChart";

interface Props {
  data: SyntheticData;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(11, 19) + "Z";
}

export function AirportPanel({ data }: Props) {
  const airport: Airport = useMemo(
    () => ({
      icao: "KJFK",
      iata: "JFK",
      name: "John F. Kennedy Intl",
      latitude: data.airport.center.lat,
      longitude: data.airport.center.lon,
      elevationFt: 13,
    }),
    [data.airport],
  );

  // Runway events
  const runwayEvents = useMemo(
    () => detectRunwayEvents(data.surfaceTracks, data.airport.runways),
    [data.surfaceTracks, data.airport.runways],
  );

  // Runway utilization
  const utilization = useMemo(() => {
    if (runwayEvents.length === 0) return new Map();
    const start = runwayEvents[0].time;
    const end = runwayEvents[runwayEvents.length - 1].time;
    return runwayUtilization(runwayEvents, { start, end });
  }, [runwayEvents]);

  // Surface tracks and taxi metrics
  const taxiStats = useMemo(() => {
    const surfaceTracks = data.surfaceTracks
      .map((t) => extractSurfaceMovement(t, airport))
      .filter(Boolean)
      .map((st) => classifyMovement(st!));

    const metrics = surfaceTracks.map((st) => computeTaxiMetrics(st, runwayEvents));
    return taxiTimeStatistics(metrics);
  }, [data.surfaceTracks, airport, runwayEvents]);

  // Gate assignments
  const gateAssignments = useMemo(() => {
    const surfaceTracks = data.surfaceTracks
      .map((t) => extractSurfaceMovement(t, airport))
      .filter(Boolean)
      .map((st) => classifyMovement(st!));

    return inferGateAssignments(surfaceTracks, data.airport.gates);
  }, [data.surfaceTracks, airport, data.airport.gates]);

  // Sequencing
  const arrivalSeq = useMemo(() => buildArrivalSequence(runwayEvents), [runwayEvents]);
  const departureSeq = useMemo(() => buildDepartureSequence(runwayEvents), [runwayEvents]);
  const arrivalSpacing = useMemo(() => interArrivalTime(arrivalSeq), [arrivalSeq]);
  const departureSpacing = useMemo(() => interArrivalTime(departureSeq), [departureSeq]);

  return (
    <div className="space-y-5 text-sm">
      <h3 className="text-lg font-semibold text-neon-cyan">Airport Analysis - KJFK</h3>

      {/* Runway Utilization */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Runway Utilization</h4>
        <RunwayUtilChart utilization={utilization} />
        <table className="w-full text-xs mt-2">
          <thead>
            <tr className="text-gray-400 border-b border-cyan-500/10">
              <th className="text-left py-1">Runway</th>
              <th className="text-right py-1">Arrivals</th>
              <th className="text-right py-1">Departures</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(utilization.entries()).map(([rwy, stats]) => (
              <tr key={rwy} className="border-b border-cyan-500/10 hover:bg-white/5">
                <td className="py-1 font-mono">{rwy}</td>
                <td className="text-right py-1 text-orange-400 font-mono">{stats.arrivals}</td>
                <td className="text-right py-1 text-orange-400 font-mono">{stats.departures}</td>
                <td className="text-right py-1 font-semibold text-orange-400 font-mono">{stats.operations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Taxi Statistics */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Taxi Statistics</h4>
        <div className="grid grid-cols-5 gap-2">
          {(["mean", "median", "p90", "p95", "max"] as const).map((key) => (
            <div key={key} className="bg-white/5 rounded p-2 text-center border border-cyan-500/10">
              <span className="text-xs text-gray-400 uppercase block">{key}</span>
              <span className="text-orange-400 font-mono text-sm">{(taxiStats[key] / 60).toFixed(1)}m</span>
            </div>
          ))}
        </div>
      </section>

      {/* Gate Assignments */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">
          Gate Assignments ({gateAssignments.length})
        </h4>
        {gateAssignments.length === 0 ? (
          <p className="text-gray-500 text-xs">No gate assignments detected</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-cyan-500/10">
                <th className="text-left py-1">Flight</th>
                <th className="text-right py-1">Arrival</th>
                <th className="text-right py-1">Departure</th>
              </tr>
            </thead>
            <tbody>
              {gateAssignments.map((ga, i) => (
                <tr key={i} className="border-b border-cyan-500/10 hover:bg-white/5">
                  <td className="py-1 font-mono">{ga.callsign ?? ga.icao24}</td>
                  <td className="text-right py-1 text-gray-300 font-mono">{formatTime(ga.arrivalTime)}</td>
                  <td className="text-right py-1 text-gray-300 font-mono">
                    {ga.departureTime ? formatTime(ga.departureTime) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Sequencing */}
      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Arrival Sequence</h4>
        {arrivalSeq.length === 0 ? (
          <p className="text-gray-500 text-xs">No arrivals</p>
        ) : (
          <>
            <div className="flex gap-3 text-xs text-gray-400 mb-1">
              <span>Mean: <span className="text-orange-400 font-mono">{arrivalSpacing.mean.toFixed(0)}s</span></span>
              <span>Min: <span className="text-orange-400 font-mono">{arrivalSpacing.min.toFixed(0)}s</span></span>
              <span>Max: <span className="text-orange-400 font-mono">{arrivalSpacing.max.toFixed(0)}s</span></span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-cyan-500/10">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Flight</th>
                  <th className="text-left py-1">Runway</th>
                  <th className="text-right py-1">Time</th>
                </tr>
              </thead>
              <tbody>
                {arrivalSeq.map((e) => (
                  <tr key={e.sequenceNumber} className="border-b border-cyan-500/10 hover:bg-white/5">
                    <td className="py-1">{e.sequenceNumber}</td>
                    <td className="py-1 font-mono">{e.callsign ?? e.icao24}</td>
                    <td className="py-1 font-mono">{e.runway}</td>
                    <td className="text-right py-1 text-gray-300 font-mono">{formatTime(e.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section>
        <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Departure Sequence</h4>
        {departureSeq.length === 0 ? (
          <p className="text-gray-500 text-xs">No departures</p>
        ) : (
          <>
            <div className="flex gap-3 text-xs text-gray-400 mb-1">
              <span>Mean: <span className="text-orange-400 font-mono">{departureSpacing.mean.toFixed(0)}s</span></span>
              <span>Min: <span className="text-orange-400 font-mono">{departureSpacing.min.toFixed(0)}s</span></span>
              <span>Max: <span className="text-orange-400 font-mono">{departureSpacing.max.toFixed(0)}s</span></span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-cyan-500/10">
                  <th className="text-left py-1">#</th>
                  <th className="text-left py-1">Flight</th>
                  <th className="text-left py-1">Runway</th>
                  <th className="text-right py-1">Time</th>
                </tr>
              </thead>
              <tbody>
                {departureSeq.map((e) => (
                  <tr key={e.sequenceNumber} className="border-b border-cyan-500/10 hover:bg-white/5">
                    <td className="py-1">{e.sequenceNumber}</td>
                    <td className="py-1 font-mono">{e.callsign ?? e.icao24}</td>
                    <td className="py-1 font-mono">{e.runway}</td>
                    <td className="text-right py-1 text-gray-300 font-mono">{formatTime(e.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
