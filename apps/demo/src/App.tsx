import { useState, useMemo, useCallback } from "react";
import { generateSyntheticData } from "./data/synthetic";
import { useReplay } from "./hooks/useReplay";
import { Toolbar } from "./components/layout/Toolbar";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomPanel } from "./components/layout/BottomPanel";
import { MapView } from "./components/map/MapView";

export type Tab = "flights" | "airport" | "weather" | "analytics";
export type HeatmapMode = "none" | "density" | "kde" | "hexbin";

export function App() {
  const [tab, setTab] = useState<Tab>("flights");
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>("none");
  const [showAirspace, setShowAirspace] = useState(true);
  const [showTileDebug, setShowTileDebug] = useState(false);

  const data = useMemo(() => generateSyntheticData(), []);
  const replay = useReplay(data.tracks);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      <Toolbar
        tab={tab}
        onTabChange={setTab}
        heatmapMode={heatmapMode}
        onHeatmapModeChange={setHeatmapMode}
        showAirspace={showAirspace}
        onToggleAirspace={() => setShowAirspace((v) => !v)}
        showTileDebug={showTileDebug}
        onToggleTileDebug={() => setShowTileDebug((v) => !v)}
        tracks={data.tracks}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          tab={tab}
          data={data}
          selectedFlight={selectedFlight}
          onSelectFlight={setSelectedFlight}
          replay={replay}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative">
            <MapView
              tab={tab}
              data={data}
              selectedFlight={selectedFlight}
              heatmapMode={heatmapMode}
              showAirspace={showAirspace}
              showTileDebug={showTileDebug}
              replay={replay}
            />
          </div>
          <BottomPanel
            data={data}
            selectedFlight={selectedFlight}
            replay={replay}
          />
        </div>
      </div>
    </div>
  );
}
