import type { SyntheticData } from "../../data/synthetic";
import type { UseReplayReturn } from "../../hooks/useReplay";
import { ReplayControls } from "../replay/ReplayControls";
import { Timeline } from "../replay/Timeline";
import { PiPView } from "../replay/PiPView";
import { AltitudeProfileChart } from "../charts/AltitudeProfileChart";

interface BottomPanelProps {
  data: SyntheticData;
  selectedFlight: string | null;
  replay: UseReplayReturn;
}

export function BottomPanel({ data, selectedFlight, replay }: BottomPanelProps) {
  const track =
    data.tracks.find((t) => t.icao24 === selectedFlight) ?? data.tracks[0] ?? null;

  return (
    <div className="h-56 glass-strong border-t border-cyan-500/20 flex shrink-0">
      {/* Left: Replay controls + timeline + PiP */}
      <div className="w-96 p-3 border-r border-cyan-500/10 flex flex-col gap-2 overflow-y-auto">
        <ReplayControls replay={replay} />
        <Timeline replay={replay} />
        <PiPView replay={replay} tracks={data.tracks} />
      </div>

      {/* Right: Altitude profile */}
      <div className="flex-1 p-3 min-w-0">
        {track ? (
          <div className="h-full flex flex-col">
            <div className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-1">
              {track.callsign ?? track.icao24} - Altitude Profile
            </div>
            <div className="flex-1 min-h-0">
              <AltitudeProfileChart track={track} />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            No flight data
          </div>
        )}
      </div>
    </div>
  );
}
