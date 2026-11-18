---
"@skylens/core": minor
"@skylens/ingest": minor
"@skylens/paths": minor
"@skylens/heatmap": minor
"@skylens/replay": minor
"@skylens/export": minor
"@skylens/airport": minor
"@skylens/airspace": minor
"@skylens/weather": minor
---

Initial release of all SkyLens packages.

- @skylens/core: Types, coordinate transforms, spatial index, FlightDNA bridge, worker pool, typed arrays
- @skylens/ingest: SBS/ADS-B Exchange/FlightAware/Beast parsers, WebSocket feed, flight phase detection
- @skylens/paths: 3D path building, Catmull-Rom smoothing, RDP simplification, LOD, holding detection, altitude profiles
- @skylens/heatmap: Density grid, KDE, hex-bin, temporal/altitude-layered heatmaps, congestion scoring
- @skylens/replay: Replay engine, clock, keyboard shortcuts, PiP tracking, frame recorder, event timeline
- @skylens/export: GeoJSON, KML, CSV, CZML, PDF report data, video frame export
- @skylens/airport: Surface movement, runway utilization, taxi metrics, gate inference, sequencing
- @skylens/airspace: GeoJSON loading, point-in-polygon, sector crossings, dwell times, rendering
- @skylens/weather: METAR/TAF/SIGMET/PIREP parsing, wind barb geometry, turbulence/icing heatmaps
