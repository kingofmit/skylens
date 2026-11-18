import { FlightTrack } from "@skylens-aviation/core";

export function flightTrackToKML(track: FlightTrack): string {
  const coords = track.states
    .map((s) => `${s.longitude},${s.latitude},${Math.round(s.altitudeFt * 0.3048)}`)
    .join("\n            ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${track.callsign ?? track.icao24}</name>
    <Placemark>
      <name>${track.callsign ?? track.icao24}</name>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
            ${coords}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

export function flightTracksToKML(tracks: FlightTrack[]): string {
  const placemarks = tracks.map((t) => {
    const coords = t.states
      .map((s) => `${s.longitude},${s.latitude},${Math.round(s.altitudeFt * 0.3048)}`)
      .join("\n            ");
    return `    <Placemark>
      <name>${t.callsign ?? t.icao24}</name>
      <LineString>
        <altitudeMode>absolute</altitudeMode>
        <coordinates>
            ${coords}
        </coordinates>
      </LineString>
    </Placemark>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>SkyLens Export</name>
${placemarks}
  </Document>
</kml>`;
}
