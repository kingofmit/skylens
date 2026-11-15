<p align="center">
  <img src=".github/SkyLens.png" alt="SkyLens" />
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/ADS--B-ready-blueviolet" alt="ADS-B" />
</p>

Open-source flight data visualization and replay toolkit — 3D flight paths, airspace heatmaps, airport surface animations, and real-time ADS-B rendering.

## Packages

| Package | Description |
|---------|-------------|
| `@skylens/core` | Shared types, coordinate transforms, interpolation |
| `@skylens/ingest` | ADS-B data loading, OpenSky API client, flight tracking |
| `@skylens/paths` | 3D flight path rendering, trail effects, line simplification |
| `@skylens/heatmap` | Airspace density grids, kernel density estimation, temporal slicing |
| `@skylens/replay` | Flight replay engine, timeline clock, multi-track sync |
| `@skylens/export` | GeoJSON, KML, and CSV export |

## Quick Start

```bash
pnpm install
pnpm build
```

```typescript
import { fetchStateVectors } from "@skylens/ingest";
import { buildDensityGrid, normalizeHeatmap } from "@skylens/heatmap";
import { flightTracksToGeoJSON } from "@skylens/export";

// Fetch live traffic over Europe
const states = await fetchStateVectors({
  minLat: 45, maxLat: 55, minLon: -5, maxLon: 15,
});

// Build a density heatmap
const grid = buildDensityGrid(states, {
  bbox: { minLat: 45, maxLat: 55, minLon: -5, maxLon: 15 },
  latBins: 100,
  lonBins: 100,
});
const normalized = normalizeHeatmap(grid);
```

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) workspaces
- [Changesets](https://github.com/changesets/changesets) for versioning

## Development

```bash
git clone https://github.com/kingofmit/skylens.git
cd skylens
pnpm install
pnpm build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## Support

If you find SkyLens useful, consider supporting its development:

<a href="https://buymeacoffee.com/kingofmit" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" /></a>

## License

[MIT](./LICENSE) - [Ahmed Allem](https://kingallem.com)
