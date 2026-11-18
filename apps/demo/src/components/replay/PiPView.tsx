import { useState, useEffect, useCallback } from "react";
import type { FlightTrack, StateVector, CameraState } from "@skylens/core";
import type { UseReplayReturn } from "../../hooks/useReplay";

interface Props {
  replay: UseReplayReturn;
  tracks: FlightTrack[];
}

export function PiPView({ replay, tracks }: Props) {
  const { pip } = replay;

  const [pipData, setPipData] = useState<{ aircraft: StateVector; camera: CameraState } | null>(
    null,
  );
  const [trackedIcao, setTrackedIcao] = useState<string | null>(null);

  useEffect(() => {
    const unsub = pip.onUpdate((data) => {
      setPipData(data);
    });
    return unsub;
  }, [pip]);

  const handleTrack = useCallback(
    (icao24: string) => {
      if (trackedIcao === icao24) {
        pip.untrack();
        setTrackedIcao(null);
        setPipData(null);
      } else {
        pip.track(icao24);
        setTrackedIcao(icao24);
      }
    },
    [pip, trackedIcao],
  );

  return (
    <div className="glass glow-cyan rounded-lg p-3">
      <h4 className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">Picture-in-Picture</h4>

      {/* Track selection */}
      <div className="flex flex-wrap gap-1 mb-3">
        {tracks.map((t) => (
          <button
            key={t.icao24}
            onClick={() => handleTrack(t.icao24)}
            className={`text-xs px-2 py-1 rounded transition-colors border ${
              trackedIcao === t.icao24
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-cyan-300 border-transparent"
            }`}
          >
            {t.callsign ?? t.icao24}
          </button>
        ))}
      </div>

      {/* PiP display */}
      {!trackedIcao ? (
        <p className="text-gray-500 text-xs">Select an aircraft to track</p>
      ) : !pipData ? (
        <div className="bg-white/5 rounded-lg p-4 text-center border border-cyan-500/10">
          <p className="text-gray-500 text-xs">
            Tracking <span className="font-mono text-cyan-400">{trackedIcao}</span> - no data at current time
          </p>
          <p className="text-gray-600 text-[10px] mt-1">Press play to see aircraft state</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-cyan-500/10">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-sm text-cyan-400">
              {pipData.aircraft.callsign ?? pipData.aircraft.icao24}
            </span>
            <span className="text-xs text-gray-400 font-mono">{pipData.aircraft.icao24}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Altitude</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.altitudeFt.toLocaleString()} ft
              </p>
            </div>
            <div>
              <span className="text-gray-500">Speed</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.groundSpeedKts.toFixed(0)} kts
              </p>
            </div>
            <div>
              <span className="text-gray-500">Heading</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.trackDeg.toFixed(0)}&deg;
              </p>
            </div>
            <div>
              <span className="text-gray-500">V/S</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.verticalRateFpm > 0 ? "+" : ""}
                {pipData.aircraft.verticalRateFpm.toFixed(0)} fpm
              </p>
            </div>
            <div>
              <span className="text-gray-500">Position</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.latitude.toFixed(4)}, {pipData.aircraft.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">On Ground</span>
              <p className="text-orange-400 font-mono">
                {pipData.aircraft.onGround ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
