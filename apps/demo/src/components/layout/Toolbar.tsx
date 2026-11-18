import { useState } from "react";
import type { FlightTrack } from "@skylens-aviation/core";
import { flightTracksToGeoJSON } from "@skylens-aviation/export";
import { flightTracksToKML } from "@skylens-aviation/export";
import { stateVectorsToCSV } from "@skylens-aviation/export";
import { flightTracksToCZML } from "@skylens-aviation/export";
import { generateReportData } from "@skylens-aviation/export";
import { downloadBlob, downloadJSON } from "../../lib/download";

type Tab = "flights" | "airport" | "weather" | "analytics";
type HeatmapMode = "none" | "density" | "kde" | "hexbin";

interface ToolbarProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  heatmapMode: HeatmapMode;
  onHeatmapModeChange: (mode: HeatmapMode) => void;
  showAirspace: boolean;
  onToggleAirspace: () => void;
  showTileDebug: boolean;
  onToggleTileDebug: () => void;
  tracks: FlightTrack[];
}

const TABS: { key: Tab; label: string }[] = [
  { key: "flights", label: "Flights" },
  { key: "airport", label: "Airport" },
  { key: "weather", label: "Weather" },
  { key: "analytics", label: "Analytics" },
];

const HEATMAP_OPTIONS: { key: HeatmapMode; label: string }[] = [
  { key: "none", label: "None" },
  { key: "density", label: "Density" },
  { key: "kde", label: "KDE" },
  { key: "hexbin", label: "Hex-bin" },
];

export function Toolbar({
  tab,
  onTabChange,
  heatmapMode,
  onHeatmapModeChange,
  showAirspace,
  onToggleAirspace,
  showTileDebug,
  onToggleTileDebug,
  tracks,
}: ToolbarProps) {
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  function handleExport(format: string) {
    setExportOpen(false);
    switch (format) {
      case "geojson": {
        const gj = flightTracksToGeoJSON(tracks);
        downloadJSON(gj, "skylens-export.geojson");
        break;
      }
      case "kml": {
        const kml = flightTracksToKML(tracks);
        downloadBlob(kml, "skylens-export.kml", "application/vnd.google-earth.kml+xml");
        break;
      }
      case "csv": {
        const csv = stateVectorsToCSV(tracks.flatMap((t) => t.states));
        downloadBlob(csv, "skylens-export.csv", "text/csv");
        break;
      }
      case "czml": {
        const czml = flightTracksToCZML(tracks);
        downloadJSON(czml, "skylens-export.czml.json");
        break;
      }
      case "report": {
        if (tracks.length > 0) {
          const report = generateReportData({ track: tracks[0] });
          downloadJSON(report, "skylens-report.json");
        }
        break;
      }
      case "frames": {
        alert("Frame recording requires active replay");
        break;
      }
    }
  }

  return (
    <header className="glass-strong flex items-center gap-2 px-4 py-2 border-b border-cyan-500/20 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mr-4 select-none">
        <svg width="32" height="32" viewBox="0 0 32 32" className="text-cyan-400">
          {/* Orbital ring */}
          <ellipse cx="16" cy="16" rx="14" ry="14" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          <ellipse cx="16" cy="16" rx="14" ry="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" transform="rotate(-20 16 16)" />
          {/* Airplane silhouette */}
          <g transform="translate(16,16) rotate(-45) translate(-8,-8)" fill="currentColor">
            <path d="M8 1 L10 5 L10 7 L15 10 L15 11 L10 9.5 L10 13 L12 15 L12 15.5 L10 14.5 L8 16 L6 14.5 L4 15.5 L4 15 L6 13 L6 9.5 L1 11 L1 10 L6 7 L6 5 Z" />
          </g>
          {/* Glow dot */}
          <circle cx="16" cy="2" r="1.5" fill="#00e5ff" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="text-neon-cyan font-bold text-xl tracking-wider">SkyLens</span>
      </div>

      {/* Tab buttons */}
      <nav className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`px-3 py-1 rounded text-sm font-medium tab-transition ${
              tab === t.key
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 pulse-glow"
                : "text-gray-400 hover:text-cyan-300 hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="w-px h-6 bg-cyan-500/20 mx-2" />

      {/* Heatmap dropdown */}
      <div className="relative">
        <button
          onClick={() => { setHeatmapOpen(!heatmapOpen); setExportOpen(false); }}
          className="px-3 py-1 rounded text-sm font-medium text-gray-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
        >
          Heatmap: {HEATMAP_OPTIONS.find((o) => o.key === heatmapMode)?.label}
          <span className="ml-1 text-xs">&#9662;</span>
        </button>
        {heatmapOpen && (
          <div className="absolute top-full left-0 mt-1 glass rounded-lg shadow-2xl shadow-cyan-500/10 z-50 min-w-[120px]">
            {HEATMAP_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => { onHeatmapModeChange(o.key); setHeatmapOpen(false); }}
                className={`block w-full text-left px-3 py-1.5 text-sm transition-colors rounded ${
                  heatmapMode === o.key
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-gray-300 hover:bg-white/5 hover:text-cyan-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle buttons */}
      <button
        onClick={onToggleAirspace}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          showAirspace
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            : "text-gray-400 hover:text-cyan-300 hover:bg-white/5"
        }`}
      >
        Airspace
      </button>

      <button
        onClick={onToggleTileDebug}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          showTileDebug
            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
            : "text-gray-400 hover:text-cyan-300 hover:bg-white/5"
        }`}
      >
        Tile Debug
      </button>

      <div className="flex-1" />

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => { setExportOpen(!exportOpen); setHeatmapOpen(false); }}
          className="px-3 py-1 rounded text-sm font-medium border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
        >
          Export <span className="text-xs">&#9662;</span>
        </button>
        {exportOpen && (
          <div className="absolute top-full right-0 mt-1 glass rounded-lg shadow-2xl shadow-cyan-500/10 z-50 min-w-[140px]">
            {[
              { key: "geojson", label: "GeoJSON" },
              { key: "kml", label: "KML" },
              { key: "csv", label: "CSV" },
              { key: "czml", label: "CZML" },
              { key: "report", label: "Report" },
              { key: "frames", label: "Frames" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleExport(opt.key)}
                className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5 hover:text-cyan-300 transition-colors rounded"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
