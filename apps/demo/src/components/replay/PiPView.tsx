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
    <div className="bg-gray-800 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Picture-in-Picture</h4>

      {/* Track selection */}
      <div className="flex flex-wrap gap-1 mb-3">
        {tracks.map((t) => (
          <button
            key={t.icao24}
            onClick={() => handleTrack(t.icao24)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              trackedIcao === t.icao24
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <p className="text-gray-500 text-xs">
            Tracking <span className="font-mono">{trackedIcao}</span> - no data at current time
          </p>
          <p className="text-gray-600 text-[10px] mt-1">Press play to see aircraft state</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-sm">
              {pipData.aircraft.callsign ?? pipData.aircraft.icao24}
            </span>
            <span className="text-xs text-gray-400 font-mono">{pipData.aircraft.icao24}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Altitude</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.altitudeFt.toLocaleString()} ft
              </p>
            </div>
            <div>
              <span className="text-gray-500">Speed</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.groundSpeedKts.toFixed(0)} kts
              </p>
            </div>
            <div>
              <span className="text-gray-500">Heading</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.trackDeg.toFixed(0)}&deg;
              </p>
            </div>
            <div>
              <span className="text-gray-500">V/S</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.verticalRateFpm > 0 ? "+" : ""}
                {pipData.aircraft.verticalRateFpm.toFixed(0)} fpm
              </p>
            </div>
            <div>
              <span className="text-gray-500">Position</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.latitude.toFixed(4)}, {pipData.aircraft.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">On Ground</span>
              <p className="font-mono text-gray-200">
                {pipData.aircraft.onGround ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
