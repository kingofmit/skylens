import { StateVector, BoundingBox, HeatmapCell } from "@skylens/core";
import { GridOptions, buildDensityGrid } from "./grid";

/** A single altitude layer with its heatmap cells */
export interface AltitudeLayer {
  minFl: number;
  maxFl: number;
  cells: HeatmapCell[];
}

/** Build altitude-layered heatmaps (e.g., FL100-FL200, FL200-FL300) */
export function buildAltitudeLayeredHeatmap(
  states: StateVector[],
  bbox: BoundingBox,
  layers: { minFl: number; maxFl: number }[],
  options: Omit<GridOptions, "bbox">,
): AltitudeLayer[] {
  return layers.map((layer) => {
    const filteredStates = states.filter((s) => {
      const fl = s.altitudeFt / 100;
      return fl >= layer.minFl && fl < layer.maxFl;
    });

    const cells = buildDensityGrid(filteredStates, {
      bbox,
      latBins: options.latBins,
      lonBins: options.lonBins,
    });

    return {
      minFl: layer.minFl,
      maxFl: layer.maxFl,
      cells,
    };
  });
}
