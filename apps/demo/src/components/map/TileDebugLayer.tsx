import type { BoundingBox } from "@skylens-aviation/core";
import { tilesInBBox, tileBounds } from "@skylens-aviation/core";

/**
 * Build GeoJSON grid lines from slippy-map tile coordinates.
 * Each tile is rendered as a polygon outline.
 */
export function getTileDebugGeoJSON(
  bounds: BoundingBox,
  zoom: number,
): GeoJSON.FeatureCollection {
  const tileZoom = Math.min(Math.max(Math.floor(zoom), 0), 18);
  const tiles = tilesInBBox(bounds, tileZoom);
  const features: GeoJSON.Feature[] = [];

  for (const tile of tiles) {
    const tb = tileBounds(tile.x, tile.y, tile.z);
    features.push({
      type: "Feature",
      properties: {
        x: tile.x,
        y: tile.y,
        z: tile.z,
        label: `${tile.z}/${tile.x}/${tile.y}`,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [tb.minLon, tb.maxLat],
            [tb.maxLon, tb.maxLat],
            [tb.maxLon, tb.minLat],
            [tb.minLon, tb.minLat],
            [tb.minLon, tb.maxLat],
          ],
        ],
      },
    });
  }

  return { type: "FeatureCollection", features };
}
