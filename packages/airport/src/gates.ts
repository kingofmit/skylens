import { haversineDistance } from "@skylens-aviation/core";
import { SurfaceTrack } from "./surface";

/** Inferred gate assignment */
export interface GateAssignment {
  icao24: string;
  callsign: string | null;
  gateLat: number;
  gateLon: number;
  arrivalTime: number;
  departureTime: number | null;
}

/** Known gate definition */
export interface KnownGate {
  name: string;
  lat: number;
  lon: number;
}

/** Infer gate assignments from surface tracks using spatial clustering */
export function inferGateAssignments(
  surfaceTracks: SurfaceTrack[],
  knownGates?: KnownGate[],
): GateAssignment[] {
  const assignments: GateAssignment[] = [];

  for (const track of surfaceTracks) {
    // Find stationary clusters (gate positions)
    const gateClusters = findStationaryClusters(track);

    for (const cluster of gateClusters) {
      let gateLat = cluster.centerLat;
      let gateLon = cluster.centerLon;

      // Match to known gate if provided
      if (knownGates && knownGates.length > 0) {
        const nearest = findNearestGate(gateLat, gateLon, knownGates);
        if (nearest && nearest.distance < 100) {
          gateLat = nearest.gate.lat;
          gateLon = nearest.gate.lon;
        }
      }

      assignments.push({
        icao24: track.icao24,
        callsign: track.callsign,
        gateLat,
        gateLon,
        arrivalTime: cluster.startTime,
        departureTime: cluster.endTime,
      });
    }
  }

  return assignments;
}

interface StationaryCluster {
  centerLat: number;
  centerLon: number;
  startTime: number;
  endTime: number | null;
}

function findStationaryClusters(track: SurfaceTrack): StationaryCluster[] {
  const clusters: StationaryCluster[] = [];
  const positions = track.positions.filter((p) => p.classification === "gate");

  if (positions.length === 0) return clusters;

  let clusterStart = 0;
  for (let i = 1; i <= positions.length; i++) {
    const isBreak =
      i === positions.length ||
      positions[i].timestamp - positions[i - 1].timestamp > 120 ||
      haversineDistance(
        positions[i - 1].lat,
        positions[i - 1].lon,
        positions[clusterStart].lat,
        positions[clusterStart].lon,
      ) > 200;

    if (isBreak) {
      const clusterPositions = positions.slice(clusterStart, i);
      const duration =
        clusterPositions[clusterPositions.length - 1].timestamp -
        clusterPositions[0].timestamp;

      if (duration >= 60) {
        const centerLat =
          clusterPositions.reduce((s, p) => s + p.lat, 0) / clusterPositions.length;
        const centerLon =
          clusterPositions.reduce((s, p) => s + p.lon, 0) / clusterPositions.length;

        clusters.push({
          centerLat,
          centerLon,
          startTime: clusterPositions[0].timestamp,
          endTime: clusterPositions[clusterPositions.length - 1].timestamp,
        });
      }
      clusterStart = i;
    }
  }

  return clusters;
}

function findNearestGate(
  lat: number,
  lon: number,
  gates: KnownGate[],
): { gate: KnownGate; distance: number } | null {
  let best: KnownGate | null = null;
  let bestDist = Infinity;

  for (const gate of gates) {
    const dist = haversineDistance(lat, lon, gate.lat, gate.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = gate;
    }
  }

  return best ? { gate: best, distance: bestDist } : null;
}
