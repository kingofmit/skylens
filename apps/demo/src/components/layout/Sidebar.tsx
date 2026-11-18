import type { SyntheticData } from "../../data/synthetic";
import type { UseReplayReturn } from "../../hooks/useReplay";
import { FlightListPanel } from "../panels/FlightListPanel";
import { FlightDetailPanel } from "../panels/FlightDetailPanel";
import { AirportPanel } from "../panels/AirportPanel";
import { WeatherPanel } from "../panels/WeatherPanel";
import { AnalyticsPanel } from "../panels/AnalyticsPanel";

type Tab = "flights" | "airport" | "weather" | "analytics";

interface SidebarProps {
  tab: Tab;
  data: SyntheticData;
  selectedFlight: string | null;
  onSelectFlight: (icao24: string | null) => void;
  replay: UseReplayReturn;
}

export function Sidebar({ tab, data, selectedFlight, onSelectFlight, replay }: SidebarProps) {
  const selectedTrack = data.tracks.find((t) => t.icao24 === selectedFlight) ?? null;

  return (
    <aside className="w-72 glass glow-cyan border-r border-cyan-500/20 overflow-y-auto shrink-0 flex flex-col">
      <div className="h-px bg-gradient-to-b from-cyan-500/5 to-transparent" />
      <div className="p-3 space-y-3 animate-fade-in" key={tab}>
        {tab === "flights" && (
          <>
            <FlightListPanel
              tracks={data.tracks}
              selectedFlight={selectedFlight}
              onSelectFlight={(id) => onSelectFlight(id === selectedFlight ? null : id)}
            />
            {selectedTrack && (
              <FlightDetailPanel
                track={selectedTrack}
                waypointFixes={data.waypointFixes}
                allTracks={data.tracks}
                boundaries={data.airspaceBoundaries}
              />
            )}
          </>
        )}
        {tab === "airport" && <AirportPanel data={data} />}
        {tab === "weather" && <WeatherPanel data={data} />}
        {tab === "analytics" && <AnalyticsPanel data={data} />}
      </div>
    </aside>
  );
}
