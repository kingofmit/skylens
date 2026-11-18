# @skylens-aviation/paths

## 0.2.0

### Minor Changes

- e8aa42b: Initial release of all SkyLens packages.

  - @skylens-aviation/core: Types, coordinate transforms, spatial index, FlightDNA bridge, worker pool, typed arrays
  - @skylens-aviation/ingest: SBS/ADS-B Exchange/FlightAware/Beast parsers, WebSocket feed, flight phase detection
  - @skylens-aviation/paths: 3D path building, Catmull-Rom smoothing, RDP simplification, LOD, holding detection, altitude profiles
  - @skylens-aviation/heatmap: Density grid, KDE, hex-bin, temporal/altitude-layered heatmaps, congestion scoring
  - @skylens-aviation/replay: Replay engine, clock, keyboard shortcuts, PiP tracking, frame recorder, event timeline
  - @skylens-aviation/export: GeoJSON, KML, CSV, CZML, PDF report data, video frame export
  - @skylens-aviation/airport: Surface movement, runway utilization, taxi metrics, gate inference, sequencing
  - @skylens-aviation/airspace: GeoJSON loading, point-in-polygon, sector crossings, dwell times, rendering
  - @skylens-aviation/weather: METAR/TAF/SIGMET/PIREP parsing, wind barb geometry, turbulence/icing heatmaps

### Patch Changes

- Updated dependencies [e8aa42b]
  - @skylens-aviation/core@0.2.0
