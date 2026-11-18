import { useMemo } from "react";
import { SpatialIndex } from "@skylens-aviation/core";
import type { FlightTrack } from "@skylens-aviation/core";

export function useSpatialIndex(tracks: FlightTrack[]) {
  return useMemo(() => {
    const index = new SpatialIndex(0.1); // 0.1° grid cells
    for (const track of tracks) {
      for (const s of track.states) {
        index.insert(track.icao24, s.latitude, s.longitude);
      }
    }
    return index;
  }, [tracks]);
}
