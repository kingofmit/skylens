import { FlightTrack, Airport } from "@skylens/core";
import { haversineDistance } from "@skylens/core";

/** Classification for a segment of surface movement */
export type SurfaceClassification = "taxi" | "runway" | "gate";

/** A position sample on the airport surface */
export interface SurfacePosition {
  lat: number;
  lon: number;
  groundSpeed: number;
  timestamp: number;
  classification: SurfaceClassification;
}

/** An aircraft's track on the airport surface */
export interface SurfaceTrack {
  icao24: string;
  callsign: string | null;
  positions: SurfacePosition[];
}

/** Extract surface movement from a flight track within an airport's vicinity */
export function extractSurfaceMovement(
  track: FlightTrack,
  airport: Airport,
  radiusM: number = 5000,
): SurfaceTrack | null {
  const positions: SurfacePosition[] = [];

  for (const state of track.states) {
    if (!state.onGround) continue;
    const dist = haversineDistance(
      state.latitude,
      state.longitude,
      airport.latitude,
      airport.longitude,
    );
    if (dist > radiusM) continue;

    positions.push({
      lat: state.latitude,
      lon: state.longitude,
      groundSpeed: state.groundSpeedKts,
      timestamp: state.timestamp,
      classification: classifySpeed(state.groundSpeedKts),
    });
  }

  if (positions.length === 0) return null;

  return {
    icao24: track.icao24,
    callsign: track.callsign,
    positions,
  };
}

/** Classify movement positions into taxi/runway/gate segments */
export function classifyMovement(surfaceTrack: SurfaceTrack): SurfaceTrack {
  const positions = surfaceTrack.positions.map((pos) => ({
    ...pos,
    classification: classifySpeed(pos.groundSpeed) as SurfaceClassification,
  }));

  // Gate: stationary (speed < 2 kts) for >30s
  let stationaryStart = -1;
  for (let i = 0; i < positions.length; i++) {
    if (positions[i].groundSpeed < 2) {
      if (stationaryStart === -1) stationaryStart = i;
      if (
        i === positions.length - 1 ||
        positions[i + 1].groundSpeed >= 2
      ) {
        const duration =
          positions[i].timestamp - positions[stationaryStart].timestamp;
        if (duration >= 30) {
          for (let j = stationaryStart; j <= i; j++) {
            positions[j].classification = "gate";
          }
        }
        stationaryStart = -1;
      }
    } else {
      stationaryStart = -1;
    }
  }

  return { ...surfaceTrack, positions };
}

function classifySpeed(speedKts: number): SurfaceClassification {
  if (speedKts > 60) return "runway";
  if (speedKts < 2) return "gate";
  return "taxi";
}
