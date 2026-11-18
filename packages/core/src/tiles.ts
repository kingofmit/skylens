import { BoundingBox, TileCoord } from "./types";

/** Convert lat/lon to slippy-map tile coordinates at a given zoom level */
export function latLonToTile(
  lat: number,
  lon: number,
  zoom: number,
): TileCoord {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), z: zoom };
}

/** Convert tile coordinates to the lat/lon of the tile's north-west corner */
export function tileToLatLon(
  x: number,
  y: number,
  z: number,
): { lat: number; lon: number } {
  const n = 2 ** z;
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lat, lon };
}

/** Get the geographic bounding box of a tile */
export function tileBounds(x: number, y: number, z: number): BoundingBox {
  const nw = tileToLatLon(x, y, z);
  const se = tileToLatLon(x + 1, y + 1, z);
  return {
    minLat: se.lat,
    maxLat: nw.lat,
    minLon: nw.lon,
    maxLon: se.lon,
  };
}

/** Get all tiles that cover a bounding box at a given zoom level */
export function tilesInBBox(bbox: BoundingBox, zoom: number): TileCoord[] {
  const topLeft = latLonToTile(bbox.maxLat, bbox.minLon, zoom);
  const bottomRight = latLonToTile(bbox.minLat, bbox.maxLon, zoom);
  const tiles: TileCoord[] = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}
