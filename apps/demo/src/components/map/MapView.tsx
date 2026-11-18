import { useRef, useEffect, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FlightTrack, BoundingBox } from "@skylens/core";
import { haversineDistance, bearing, greatCircleArc } from "@skylens/core";
import { useMap } from "../../hooks/useMap";
import type { SyntheticData } from "../../data/synthetic";
import type { UseReplayReturn } from "../../hooks/useReplay";

import { getFlightPathGeoJSON, getPhaseSegmentedGeoJSON } from "./FlightPathLayer";
import { getHeatmapGeoJSON, type HeatmapMode } from "./HeatmapLayer";
import { getAirspaceGeoJSON } from "./AirspaceLayer";
import { getWeatherGeoJSON } from "./WeatherLayer";
import { getAirportGeoJSON } from "./AirportLayer";
import { getMarkerGeoJSON } from "./MarkerLayer";
import { getTileDebugGeoJSON } from "./TileDebugLayer";

type Tab = "flights" | "airport" | "weather" | "analytics";

interface MapViewProps {
  tab: Tab;
  data: SyntheticData;
  selectedFlight: string | null;
  heatmapMode: HeatmapMode;
  showAirspace: boolean;
  showTileDebug: boolean;
  replay: UseReplayReturn;
}

/* ── Layer IDs ─────────────────────────────────────────────────────── */

const LAYER_IDS = {
  flightPaths: "flight-paths",
  flightPathsPhase: "flight-paths-phase",
  flightPathsPhaseGlow: "flight-paths-phase-glow",
  aircraft: "aircraft-points",
  aircraftGlow: "aircraft-glow",
  holding: "holding-markers",
  holdingOrbit: "holding-orbit-outline",
  holdingOrbitFill: "holding-orbit-fill",
  waypoints: "waypoint-markers",
  waypointLabels: "waypoint-labels",
  crossings: "crossing-markers",
  airspace: "airspace-fill",
  airspaceGlow: "airspace-glow",
  airspaceOutline: "airspace-outline",
  heatmap: "heatmap-layer",
  tileDebug: "tile-debug",
  tileDebugOutline: "tile-debug-outline",
  greatCircle: "great-circle-arcs",
  greatCircleGlow: "great-circle-arcs-glow",
  // Airport
  surfacePaths: "surface-paths",
  runways: "runways",
  gates: "gate-markers",
  gateLabels: "gate-labels",
  // Weather
  windBarbs: "wind-barbs",
  metarStations: "metar-stations",
  sigmets: "sigmet-fill",
  sigmetOutline: "sigmet-outline",
  pireps: "pirep-markers",
  // Analytics
  healthPath: "health-path",
  healthPathGlow: "health-path-glow",
  anomalyMarkers: "anomaly-markers",
  anomalyGlow: "anomaly-glow",
} as const;

/* ── Neon flight colors by callsign ──────────────────────────────── */

const NEON_FLIGHT_COLORS: Record<string, string> = {
  AAL100: "#00e5ff",   // cyan
  BAW304: "#39ff14",   // green
  UAL1234: "#ff9100",  // orange
};
const DEFAULT_NEON_COLOR = "#00e5ff";

const ALL_LAYER_IDS = Object.values(LAYER_IDS);

/* ── Helpers ──────────────────────────────────────────────────────── */

function getSourceId(layerId: string) {
  return `${layerId}-src`;
}

function safeSetData(map: maplibregl.Map, sourceId: string, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (src) {
    src.setData(data);
  }
}

function removeLayers(map: maplibregl.Map) {
  // Also remove auxiliary layers that share a source with a managed layer
  const extraLayers = [LAYER_IDS.waypoints + "-inner"];
  for (const id of [...ALL_LAYER_IDS, ...extraLayers]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of ALL_LAYER_IDS) {
    const srcId = getSourceId(id);
    if (map.getSource(srcId)) map.removeSource(srcId);
  }
}

function addSourceAndLayer(
  map: maplibregl.Map,
  layerId: string,
  data: GeoJSON.FeatureCollection,
  layerDef: Omit<maplibregl.LayerSpecification, "id" | "source"> & Record<string, unknown>,
) {
  const srcId = getSourceId(layerId);
  if (!map.getSource(srcId)) {
    map.addSource(srcId, { type: "geojson", data });
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({ ...layerDef, id: layerId, source: srcId } as maplibregl.LayerSpecification);
  }
}

/* ── Airplane icon ────────────────────────────────────────────────── */

function createAirplaneIcon(map: maplibregl.Map) {
  if (map.hasImage("airplane-icon")) return;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw airplane silhouette pointing UP (0deg)
  ctx.fillStyle = "#00e5ff";
  ctx.shadowColor = "#00e5ff";
  ctx.shadowBlur = 6;
  ctx.beginPath();
  // Fuselage
  ctx.moveTo(16, 2);   // nose
  ctx.lineTo(18, 10);
  ctx.lineTo(18, 14);
  // Right wing
  ctx.lineTo(28, 18);
  ctx.lineTo(28, 20);
  ctx.lineTo(18, 18);
  // Body continue
  ctx.lineTo(18, 24);
  // Right tail
  ctx.lineTo(22, 28);
  ctx.lineTo(22, 29);
  ctx.lineTo(18, 27);
  ctx.lineTo(16, 30); // tail point
  ctx.lineTo(14, 27);
  ctx.lineTo(10, 29);
  ctx.lineTo(10, 28);
  ctx.lineTo(14, 24);
  ctx.lineTo(14, 18);
  ctx.lineTo(4, 20);
  ctx.lineTo(4, 18);
  ctx.lineTo(14, 14);
  ctx.lineTo(14, 10);
  ctx.closePath();
  ctx.fill();

  map.addImage("airplane-icon", { width: size, height: size, data: ctx.getImageData(0, 0, size, size).data });
}

/* ── Component ─────────────────────────────────────────────────────── */

export function MapView({
  tab,
  data,
  selectedFlight,
  heatmapMode,
  showAirspace,
  showTileDebug,
  replay,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { map, loaded } = useMap(containerRef);
  const [hoverInfo, setHoverInfo] = useState<{ lat: number; lon: number; dist: string; brg: string } | null>(null);
  const prevTabRef = useRef<Tab>(tab);

  // Build great-circle arcs for flights tab
  const arcGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    const features: GeoJSON.Feature[] = [];
    // Build arcs for first/last state of each track
    for (const track of data.tracks) {
      const { states } = track;
      if (states.length < 2) continue;
      const first = states[0];
      const last = states[states.length - 1];
      const arcPts = greatCircleArc(first.latitude, first.longitude, last.latitude, last.longitude, 64);
      features.push({
        type: "Feature",
        properties: { icao24: track.icao24, callsign: track.callsign },
        geometry: {
          type: "LineString",
          coordinates: arcPts.map((p) => [p.lon, p.lat]),
        },
      });
    }
    return { type: "FeatureCollection", features };
  }, [data.tracks]);

  // Set up hover handler for distance/bearing info
  useEffect(() => {
    if (!map || !loaded) return;

    let refPoint: { lat: number; lon: number } | null = null;

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      if (refPoint) {
        const dist = haversineDistance(refPoint.lat, refPoint.lon, lat, lng);
        const brg = bearing(refPoint.lat, refPoint.lon, lat, lng);
        setHoverInfo({
          lat,
          lon: lng,
          dist: dist > 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`,
          brg: `${brg.toFixed(1)}°`,
        });
      } else {
        setHoverInfo(null);
      }
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      if (refPoint) {
        refPoint = null;
        setHoverInfo(null);
      } else {
        refPoint = { lat, lon: lng };
      }
    };

    map.on("mousemove", onMouseMove);
    map.on("click", onClick);
    return () => {
      map.off("mousemove", onMouseMove);
      map.off("click", onClick);
    };
  }, [map, loaded]);

  // Main effect: set up / update layers when props change
  useEffect(() => {
    if (!map || !loaded) return;

    // Remove all managed layers on tab change to prevent conflicts
    if (prevTabRef.current !== tab) {
      removeLayers(map);
      prevTabRef.current = tab;
    }

    // Ensure airplane icon is registered
    createAirplaneIcon(map);

    switch (tab) {
      case "flights":
        setupFlightsLayers(map, data, selectedFlight, heatmapMode, showAirspace, showTileDebug, arcGeoJSON);
        break;
      case "airport":
        setupAirportLayers(map, data);
        break;
      case "weather":
        setupWeatherLayers(map, data);
        break;
      case "analytics":
        setupAnalyticsLayers(map, data);
        break;
    }
  }, [map, loaded, tab, data, selectedFlight, heatmapMode, showAirspace, showTileDebug, arcGeoJSON]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="w-full h-full" />

      {/* Distance/bearing overlay */}
      {hoverInfo && (
        <div className="absolute top-2 right-2 bg-gray-900/80 backdrop-blur text-xs text-gray-200 px-3 py-2 rounded shadow pointer-events-none z-10">
          <div>Lat: {hoverInfo.lat.toFixed(5)}</div>
          <div>Lon: {hoverInfo.lon.toFixed(5)}</div>
          <div>Dist: {hoverInfo.dist}</div>
          <div>Brg: {hoverInfo.brg}</div>
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-8 left-2 glass rounded px-2 py-1 text-[10px] font-mono flex items-center gap-3 z-10">
        <span className="text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          LIVE
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">{tab} view</span>
      </div>
    </div>
  );
}

/* ── Layer setup per tab ──────────────────────────────────────────── */

function setupFlightsLayers(
  map: maplibregl.Map,
  data: SyntheticData,
  selectedFlight: string | null,
  heatmapMode: HeatmapMode,
  showAirspace: boolean,
  showTileDebug: boolean,
  arcGeoJSON: GeoJSON.FeatureCollection,
) {
  // Phase-colored flight paths with neon glow
  const phaseGJ = getPhaseSegmentedGeoJSON(data.tracks);

  // Build a maplibre match expression for neon colors by callsign
  const neonColorParts: (string | string[])[] = [];
  for (const track of data.tracks) {
    const cs = track.callsign ?? track.icao24;
    const color = NEON_FLIGHT_COLORS[cs] ?? DEFAULT_NEON_COLOR;
    neonColorParts.push(track.icao24, color);
  }
  const neonColorExpr = ["match", ["get", "icao24"], ...neonColorParts, DEFAULT_NEON_COLOR] as unknown as maplibregl.ExpressionSpecification;

  if (map.getSource(getSourceId(LAYER_IDS.flightPathsPhaseGlow))) {
    safeSetData(map, getSourceId(LAYER_IDS.flightPathsPhaseGlow), phaseGJ);
    safeSetData(map, getSourceId(LAYER_IDS.flightPathsPhase), phaseGJ);
  } else {
    // Glow layer (wider, blurred, underneath)
    addSourceAndLayer(map, LAYER_IDS.flightPathsPhaseGlow, phaseGJ, {
      type: "line",
      paint: {
        "line-color": neonColorExpr,
        "line-width": ["case", ["==", ["get", "icao24"], selectedFlight ?? ""], 10, 7],
        "line-blur": 5,
        "line-opacity": 0.4,
      },
    });
    // Sharp line on top
    addSourceAndLayer(map, LAYER_IDS.flightPathsPhase, phaseGJ, {
      type: "line",
      paint: {
        "line-color": neonColorExpr,
        "line-width": ["case", ["==", ["get", "icao24"], selectedFlight ?? ""], 3, 2],
        "line-blur": 0,
        "line-opacity": 0.9,
      },
    });
  }

  // Aircraft position markers with cyan glow
  const pathGJ = getFlightPathGeoJSON(data.tracks, selectedFlight);
  const aircraftGJ: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: pathGJ.features.filter((f) => f.properties?.type === "aircraft"),
  };
  if (map.getSource(getSourceId(LAYER_IDS.aircraftGlow))) {
    safeSetData(map, getSourceId(LAYER_IDS.aircraftGlow), aircraftGJ);
    safeSetData(map, getSourceId(LAYER_IDS.aircraft), aircraftGJ);
  } else {
    // Outer glow circle (larger, more subtle)
    addSourceAndLayer(map, LAYER_IDS.aircraftGlow, aircraftGJ, {
      type: "circle",
      paint: {
        "circle-radius": ["case", ["==", ["get", "selected"], true], 20, 14],
        "circle-color": "#00e5ff",
        "circle-opacity": 0.18,
        "circle-blur": 1,
      },
    });
    // Airplane SVG symbol layer
    addSourceAndLayer(map, LAYER_IDS.aircraft, aircraftGJ, {
      type: "symbol",
      layout: {
        "icon-image": "airplane-icon",
        "icon-size": ["case", ["==", ["get", "selected"], true], 1.2, 0.8],
        "icon-rotate": ["get", "heading"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  }

  // Great-circle arcs — dashed cyan with glow
  if (map.getSource(getSourceId(LAYER_IDS.greatCircleGlow))) {
    safeSetData(map, getSourceId(LAYER_IDS.greatCircleGlow), arcGeoJSON);
    safeSetData(map, getSourceId(LAYER_IDS.greatCircle), arcGeoJSON);
  } else {
    // Glow layer
    addSourceAndLayer(map, LAYER_IDS.greatCircleGlow, arcGeoJSON, {
      type: "line",
      paint: {
        "line-color": "#00e5ff",
        "line-width": 4,
        "line-blur": 4,
        "line-opacity": 0.3,
      },
    });
    // Sharp dashed line
    addSourceAndLayer(map, LAYER_IDS.greatCircle, arcGeoJSON, {
      type: "line",
      paint: {
        "line-color": "#00e5ff",
        "line-width": 1,
        "line-dasharray": [4, 4],
        "line-opacity": 0.6,
      },
    });
  }

  // Markers (holding, waypoints, crossings)
  const markers = getMarkerGeoJSON(
    data.tracks,
    data.waypointFixes,
    data.airspaceBoundaries,
    data.flightDNAMetrics,
  );

  // Holding orbit circle polygons (fill + dashed outline)
  if (map.getSource(getSourceId(LAYER_IDS.holdingOrbitFill))) {
    safeSetData(map, getSourceId(LAYER_IDS.holdingOrbitFill), markers.holdingOrbits);
    safeSetData(map, getSourceId(LAYER_IDS.holdingOrbit), markers.holdingOrbits);
  } else {
    addSourceAndLayer(map, LAYER_IDS.holdingOrbitFill, markers.holdingOrbits, {
      type: "fill",
      paint: {
        "fill-color": "#00e5ff",
        "fill-opacity": 0.05,
      },
    });
    addSourceAndLayer(map, LAYER_IDS.holdingOrbit, markers.holdingOrbits, {
      type: "line",
      paint: {
        "line-color": "#00e5ff",
        "line-width": 1.5,
        "line-dasharray": [4, 4],
        "line-opacity": 0.6,
      },
    });
  }

  // Holding pattern center markers
  if (map.getSource(getSourceId(LAYER_IDS.holding))) {
    safeSetData(map, getSourceId(LAYER_IDS.holding), markers.holdingPatterns);
  } else {
    addSourceAndLayer(map, LAYER_IDS.holding, markers.holdingPatterns, {
      type: "circle",
      paint: {
        "circle-radius": 12,
        "circle-color": "#ec4899",
        "circle-opacity": 0.6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ec4899",
      },
    });
  }

  // Waypoint markers — outer glow ring + bright inner dot
  if (map.getSource(getSourceId(LAYER_IDS.waypoints))) {
    safeSetData(map, getSourceId(LAYER_IDS.waypoints), markers.waypoints);
  } else {
    addSourceAndLayer(map, LAYER_IDS.waypoints, markers.waypoints, {
      type: "circle",
      paint: {
        "circle-radius": 8,
        "circle-color": "#10b981",
        "circle-opacity": 0.15,
        "circle-blur": 0.8,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#10b981",
        "circle-stroke-opacity": 0.4,
      },
    });
    // Inner bright dot on same source (separate layer, shared source)
    const wpInnerLayerId = LAYER_IDS.waypoints + "-inner";
    if (!map.getLayer(wpInnerLayerId)) {
      map.addLayer({
        id: wpInnerLayerId,
        type: "circle",
        source: getSourceId(LAYER_IDS.waypoints),
        paint: {
          "circle-radius": 3,
          "circle-color": "#10b981",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    }
  }

  // Waypoint labels with text halo
  if (map.getSource(getSourceId(LAYER_IDS.waypointLabels))) {
    safeSetData(map, getSourceId(LAYER_IDS.waypointLabels), markers.waypoints);
  } else {
    addSourceAndLayer(map, LAYER_IDS.waypointLabels, markers.waypoints, {
      type: "symbol",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#00e5ff",
        "text-halo-color": "rgba(0,0,0,0.8)",
        "text-halo-width": 1,
      },
    });
  }

  // Sector crossings
  if (map.getSource(getSourceId(LAYER_IDS.crossings))) {
    safeSetData(map, getSourceId(LAYER_IDS.crossings), markers.crossings);
  } else {
    addSourceAndLayer(map, LAYER_IDS.crossings, markers.crossings, {
      type: "circle",
      paint: {
        "circle-radius": 6,
        "circle-color": [
          "case",
          ["==", ["get", "type"], "sector_entry"],
          "#22c55e",
          "#ef4444",
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  // Airspace
  const airspaceGJ = showAirspace
    ? getAirspaceGeoJSON(data.airspaceBoundaries)
    : { type: "FeatureCollection" as const, features: [] };

  if (map.getSource(getSourceId(LAYER_IDS.airspace))) {
    safeSetData(map, getSourceId(LAYER_IDS.airspace), airspaceGJ);
    safeSetData(map, getSourceId(LAYER_IDS.airspaceGlow), airspaceGJ);
    safeSetData(map, getSourceId(LAYER_IDS.airspaceOutline), airspaceGJ);
  } else {
    addSourceAndLayer(map, LAYER_IDS.airspace, airspaceGJ, {
      type: "fill",
      paint: {
        "fill-color": "#00e5ff",
        "fill-opacity": 0.03,
      },
    });
    // Glow layer (wider blurred line underneath)
    addSourceAndLayer(map, LAYER_IDS.airspaceGlow, airspaceGJ, {
      type: "line",
      paint: {
        "line-color": "#00e5ff",
        "line-width": 4,
        "line-blur": 3,
        "line-opacity": 0.3,
      },
    });
    // Sharp outline on top
    addSourceAndLayer(map, LAYER_IDS.airspaceOutline, airspaceGJ, {
      type: "line",
      paint: {
        "line-color": "#8b5cf6",
        "line-width": 1.5,
        "line-opacity": 0.6,
        "line-dasharray": [4, 2],
      },
    });
  }

  // Heatmap
  const heatmapGJ = getHeatmapGeoJSON(data.tracks, heatmapMode);
  if (map.getSource(getSourceId(LAYER_IDS.heatmap))) {
    safeSetData(map, getSourceId(LAYER_IDS.heatmap), heatmapGJ);
    // Toggle visibility
    map.setLayoutProperty(
      LAYER_IDS.heatmap,
      "visibility",
      heatmapMode === "none" ? "none" : "visible",
    );
  } else {
    addSourceAndLayer(map, LAYER_IDS.heatmap, heatmapGJ, {
      type: "heatmap",
      layout: {
        visibility: heatmapMode === "none" ? "none" : "visible",
      },
      paint: {
        "heatmap-weight": ["get", "weight"],
        "heatmap-intensity": 1,
        "heatmap-radius": 30,
        "heatmap-opacity": 0.6,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.2, "rgba(100,20,0,0.4)",
          0.4, "rgba(180,60,0,0.6)",
          0.6, "rgba(255,120,0,0.8)",
          0.8, "rgba(255,180,50,0.9)",
          1, "rgba(255,240,150,1)",
        ],
      },
    });
  }

  // Tile debug
  setupTileDebug(map, showTileDebug);
}

function setupAirportLayers(map: maplibregl.Map, data: SyntheticData) {
  const airportGJ = getAirportGeoJSON(data.surfaceTracks, data.airport);

  // Surface paths
  if (map.getSource(getSourceId(LAYER_IDS.surfacePaths))) {
    safeSetData(map, getSourceId(LAYER_IDS.surfacePaths), airportGJ.surfacePaths);
  } else {
    addSourceAndLayer(map, LAYER_IDS.surfacePaths, airportGJ.surfacePaths, {
      type: "line",
      paint: {
        "line-color": "#f59e0b",
        "line-width": 2,
        "line-opacity": 0.8,
      },
    });
  }

  // Runways
  if (map.getSource(getSourceId(LAYER_IDS.runways))) {
    safeSetData(map, getSourceId(LAYER_IDS.runways), airportGJ.runways);
  } else {
    addSourceAndLayer(map, LAYER_IDS.runways, airportGJ.runways, {
      type: "line",
      paint: {
        "line-color": "#ffffff",
        "line-width": 6,
        "line-opacity": 0.7,
      },
    });
  }

  // Gates
  if (map.getSource(getSourceId(LAYER_IDS.gates))) {
    safeSetData(map, getSourceId(LAYER_IDS.gates), airportGJ.gates);
  } else {
    addSourceAndLayer(map, LAYER_IDS.gates, airportGJ.gates, {
      type: "circle",
      paint: {
        "circle-radius": 6,
        "circle-color": "#3b82f6",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  // Gate labels
  if (map.getSource(getSourceId(LAYER_IDS.gateLabels))) {
    safeSetData(map, getSourceId(LAYER_IDS.gateLabels), airportGJ.gates);
  } else {
    addSourceAndLayer(map, LAYER_IDS.gateLabels, airportGJ.gates, {
      type: "symbol",
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
      },
      paint: {
        "text-color": "#93c5fd",
        "text-halo-color": "#000000",
        "text-halo-width": 1,
      },
    });
  }

  // Fly to airport center
  map.flyTo({
    center: [data.airport.center.lon, data.airport.center.lat],
    zoom: 13,
    duration: 1000,
  });
}

function setupWeatherLayers(map: maplibregl.Map, data: SyntheticData) {
  const weatherGJ = getWeatherGeoJSON(data.metarStrings, data.sigmetGeoJSON, data.pirepStrings);

  // Wind barb / METAR station markers
  if (map.getSource(getSourceId(LAYER_IDS.windBarbs))) {
    safeSetData(map, getSourceId(LAYER_IDS.windBarbs), weatherGJ.windBarbs);
  } else {
    addSourceAndLayer(map, LAYER_IDS.windBarbs, weatherGJ.windBarbs, {
      type: "circle",
      filter: ["==", ["get", "type"], "wind_barb"],
      paint: {
        "circle-radius": 4,
        "circle-color": "#60a5fa",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
      },
    });
  }

  // METAR station labels
  const metarStations: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: weatherGJ.windBarbs.features.filter((f) => f.properties?.type === "metar_station"),
  };
  if (map.getSource(getSourceId(LAYER_IDS.metarStations))) {
    safeSetData(map, getSourceId(LAYER_IDS.metarStations), metarStations);
  } else {
    addSourceAndLayer(map, LAYER_IDS.metarStations, metarStations, {
      type: "symbol",
      layout: {
        "text-field": ["concat", ["get", "station"], " ", ["get", "category"]],
        "text-size": 11,
        "text-offset": [0, 1.5],
        "text-anchor": "top",
      },
      paint: {
        "text-color": [
          "match",
          ["get", "category"],
          "VFR", "#10b981",
          "MVFR", "#3b82f6",
          "IFR", "#ef4444",
          "LIFR", "#7c3aed",
          "#ffffff",
        ],
        "text-halo-color": "#000000",
        "text-halo-width": 1,
      },
    });
  }

  // SIGMET polygons
  if (map.getSource(getSourceId(LAYER_IDS.sigmets))) {
    safeSetData(map, getSourceId(LAYER_IDS.sigmets), weatherGJ.sigmets);
    safeSetData(map, getSourceId(LAYER_IDS.sigmetOutline), weatherGJ.sigmets);
  } else {
    addSourceAndLayer(map, LAYER_IDS.sigmets, weatherGJ.sigmets, {
      type: "fill",
      paint: {
        "fill-color": "#ef4444",
        "fill-opacity": 0.15,
      },
    });
    addSourceAndLayer(map, LAYER_IDS.sigmetOutline, weatherGJ.sigmets, {
      type: "line",
      paint: {
        "line-color": "#ef4444",
        "line-width": 2,
        "line-dasharray": [4, 2],
      },
    });
  }

  // PIREP markers
  if (map.getSource(getSourceId(LAYER_IDS.pireps))) {
    safeSetData(map, getSourceId(LAYER_IDS.pireps), weatherGJ.pireps);
  } else {
    addSourceAndLayer(map, LAYER_IDS.pireps, weatherGJ.pireps, {
      type: "circle",
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    });
  }

  // Zoom out to see all weather
  map.flyTo({ center: [-90, 40], zoom: 3, duration: 1000 });
}

function setupAnalyticsLayers(map: maplibregl.Map, data: SyntheticData) {
  const markers = getMarkerGeoJSON(
    data.tracks,
    data.waypointFixes,
    data.airspaceBoundaries,
    data.flightDNAMetrics,
  );

  // Health-colored path with glow
  if (map.getSource(getSourceId(LAYER_IDS.healthPathGlow))) {
    safeSetData(map, getSourceId(LAYER_IDS.healthPathGlow), markers.healthPath);
    safeSetData(map, getSourceId(LAYER_IDS.healthPath), markers.healthPath);
  } else {
    // Glow layer follows health color
    addSourceAndLayer(map, LAYER_IDS.healthPathGlow, markers.healthPath, {
      type: "line",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 8,
        "line-blur": 5,
        "line-opacity": 0.4,
      },
    });
    // Sharp line on top
    addSourceAndLayer(map, LAYER_IDS.healthPath, markers.healthPath, {
      type: "line",
      paint: {
        "line-color": ["get", "color"],
        "line-width": 3,
        "line-blur": 0,
        "line-opacity": 0.9,
      },
    });
  }

  // Anomaly markers — glow ring + inner marker
  if (map.getSource(getSourceId(LAYER_IDS.anomalyGlow))) {
    safeSetData(map, getSourceId(LAYER_IDS.anomalyGlow), markers.anomalyMarkers);
    safeSetData(map, getSourceId(LAYER_IDS.anomalyMarkers), markers.anomalyMarkers);
  } else {
    // Outer pulse glow
    addSourceAndLayer(map, LAYER_IDS.anomalyGlow, markers.anomalyMarkers, {
      type: "circle",
      paint: {
        "circle-radius": 16,
        "circle-color": "#ff5252",
        "circle-opacity": 0.2,
        "circle-blur": 1,
      },
    });
    // Inner bright marker
    addSourceAndLayer(map, LAYER_IDS.anomalyMarkers, markers.anomalyMarkers, {
      type: "circle",
      paint: {
        "circle-radius": 8,
        "circle-color": "#ef4444",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-opacity": 0.8,
      },
    });
  }

  // Zoom to the first track
  if (data.tracks.length > 0) {
    const states = data.tracks[0].states;
    if (states.length > 0) {
      const mid = states[Math.floor(states.length / 2)];
      map.flyTo({ center: [mid.longitude, mid.latitude], zoom: 5, duration: 1000 });
    }
  }
}

function setupTileDebug(map: maplibregl.Map, show: boolean) {
  if (!show) {
    // Remove tile debug layers if they exist
    if (map.getLayer(LAYER_IDS.tileDebug)) map.removeLayer(LAYER_IDS.tileDebug);
    if (map.getLayer(LAYER_IDS.tileDebugOutline)) map.removeLayer(LAYER_IDS.tileDebugOutline);
    if (map.getSource(getSourceId(LAYER_IDS.tileDebug))) map.removeSource(getSourceId(LAYER_IDS.tileDebug));
    if (map.getSource(getSourceId(LAYER_IDS.tileDebugOutline))) map.removeSource(getSourceId(LAYER_IDS.tileDebugOutline));
    return;
  }

  const bounds = map.getBounds();
  const zoom = map.getZoom();
  const bbox: BoundingBox = {
    minLat: bounds.getSouth(),
    maxLat: bounds.getNorth(),
    minLon: bounds.getWest(),
    maxLon: bounds.getEast(),
  };

  const tileGJ = getTileDebugGeoJSON(bbox, zoom);

  if (map.getSource(getSourceId(LAYER_IDS.tileDebugOutline))) {
    safeSetData(map, getSourceId(LAYER_IDS.tileDebugOutline), tileGJ);
  } else {
    addSourceAndLayer(map, LAYER_IDS.tileDebugOutline, tileGJ, {
      type: "line",
      paint: {
        "line-color": "#22c55e",
        "line-width": 0.5,
        "line-opacity": 0.4,
      },
    });
  }
}
