import { FlightTrack } from "@skylens/core";
import { ftToM } from "@skylens/core";

/** Convert a flight track to a Cesium CZML packet array */
export function flightTrackToCZML(track: FlightTrack): object[] {
  const { states } = track;
  if (states.length === 0) return [];

  const startTime = new Date(states[0].timestamp * 1000).toISOString();
  const endTime = new Date(states[states.length - 1].timestamp * 1000).toISOString();

  // Build cartographic position array: [time, lon, lat, alt, time, lon, lat, alt, ...]
  const cartographicDegrees: number[] = [];
  for (const s of states) {
    cartographicDegrees.push(
      s.timestamp - states[0].timestamp,
      s.longitude,
      s.latitude,
      ftToM(s.altitudeFt),
    );
  }

  const document: object = {
    id: "document",
    name: track.callsign ?? track.icao24,
    version: "1.0",
    clock: {
      interval: `${startTime}/${endTime}`,
      currentTime: startTime,
      multiplier: 1,
      range: "LOOP_STOP",
      step: "SYSTEM_CLOCK_MULTIPLIER",
    },
  };

  const packet: object = {
    id: `flight-${track.icao24}`,
    name: track.callsign ?? track.icao24,
    description: `Flight ${track.callsign ?? track.icao24} (${track.icao24})`,
    availability: `${startTime}/${endTime}`,
    position: {
      epoch: startTime,
      cartographicDegrees,
      interpolationAlgorithm: "LAGRANGE",
      interpolationDegree: 1,
    },
    point: {
      pixelSize: 8,
      color: { rgba: [255, 200, 0, 255] },
      outlineColor: { rgba: [0, 0, 0, 255] },
      outlineWidth: 1,
    },
    path: {
      material: { solidColor: { color: { rgba: [255, 200, 0, 200] } } },
      width: 2,
      leadTime: 0,
      trailTime: 600,
    },
    label: {
      text: track.callsign ?? track.icao24,
      font: "12px sans-serif",
      fillColor: { rgba: [255, 255, 255, 255] },
      outlineColor: { rgba: [0, 0, 0, 255] },
      outlineWidth: 2,
      style: "FILL_AND_OUTLINE",
      pixelOffset: { cartesian2: [10, -10] },
    },
  };

  return [document, packet];
}

/** Convert multiple flight tracks to a complete CZML document */
export function flightTracksToCZML(tracks: FlightTrack[]): object[] {
  if (tracks.length === 0) return [];

  // Find global time range
  let globalStart = Infinity;
  let globalEnd = -Infinity;
  for (const t of tracks) {
    for (const s of t.states) {
      if (s.timestamp < globalStart) globalStart = s.timestamp;
      if (s.timestamp > globalEnd) globalEnd = s.timestamp;
    }
  }

  const startISO = new Date(globalStart * 1000).toISOString();
  const endISO = new Date(globalEnd * 1000).toISOString();

  const document: object = {
    id: "document",
    name: "SkyLens Flight Tracks",
    version: "1.0",
    clock: {
      interval: `${startISO}/${endISO}`,
      currentTime: startISO,
      multiplier: 1,
      range: "LOOP_STOP",
      step: "SYSTEM_CLOCK_MULTIPLIER",
    },
  };

  const packets: object[] = [document];
  for (const track of tracks) {
    const trackPackets = flightTrackToCZML(track);
    // Skip the document packet from individual tracks, take only the flight packet
    if (trackPackets.length > 1) {
      packets.push(trackPackets[1]);
    }
  }

  return packets;
}
