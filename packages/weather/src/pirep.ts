import { HeatmapCell, BoundingBox } from "@skylens/core";

/** Turbulence intensity */
export type TurbulenceIntensity = "NEG" | "LGT" | "MOD" | "SEV" | "EXTRM";

/** Icing intensity */
export type IcingIntensity = "NEG" | "TRC" | "LGT" | "MOD" | "SEV";

/** Parsed Pilot Report */
export interface PIREP {
  lat: number;
  lon: number;
  altitudeFt: number;
  time: number;
  turbulence?: TurbulenceIntensity;
  icing?: IcingIntensity;
  raw: string;
}

/** Parse a PIREP string (UA or UUA format) */
export function parsePIREP(raw: string): PIREP {
  let lat = 0;
  let lon = 0;
  let altitudeFt = 0;
  let time = 0;
  let turbulence: TurbulenceIntensity | undefined;
  let icing: IcingIntensity | undefined;

  // Location: /OV xxx (various formats)
  const ovMatch = raw.match(/\/OV\s+(\d{3,4})([NS])(\d{4,5})([EW])/);
  if (ovMatch) {
    lat = parseCoord(ovMatch[1], ovMatch[2]);
    lon = parseCoord(ovMatch[3], ovMatch[4]);
  }

  // Altitude: /FL xxx or /ALT xxx
  const flMatch = raw.match(/\/FL(\d{3})/);
  if (flMatch) altitudeFt = parseInt(flMatch[1]) * 100;
  const altMatch = raw.match(/\/ALT\s*(\d+)/);
  if (altMatch && !flMatch) altitudeFt = parseInt(altMatch[1]);

  // Time: /TM xxxx
  const tmMatch = raw.match(/\/TM\s*(\d{4})/);
  if (tmMatch) {
    const now = new Date();
    now.setUTCHours(parseInt(tmMatch[1].slice(0, 2)), parseInt(tmMatch[1].slice(2)), 0, 0);
    time = now.getTime() / 1000;
  }

  // Turbulence: /TB xxx
  const tbMatch = raw.match(/\/TB\s+(NEG|SMTH|LGT|LGT-MOD|MOD|MOD-SEV|SEV|EXTRM)/i);
  if (tbMatch) {
    const tb = tbMatch[1].toUpperCase();
    if (tb === "NEG" || tb === "SMTH") turbulence = "NEG";
    else if (tb === "LGT" || tb === "LGT-MOD") turbulence = "LGT";
    else if (tb === "MOD" || tb === "MOD-SEV") turbulence = "MOD";
    else if (tb === "SEV") turbulence = "SEV";
    else if (tb === "EXTRM") turbulence = "EXTRM";
  }

  // Icing: /IC xxx
  const icMatch = raw.match(/\/IC\s+(NEG|TRC|LGT|LGT-MOD|MOD|MOD-SEV|SEV)/i);
  if (icMatch) {
    const ic = icMatch[1].toUpperCase();
    if (ic === "NEG") icing = "NEG";
    else if (ic === "TRC") icing = "TRC";
    else if (ic === "LGT" || ic === "LGT-MOD") icing = "LGT";
    else if (ic === "MOD" || ic === "MOD-SEV") icing = "MOD";
    else if (ic === "SEV") icing = "SEV";
  }

  return { lat, lon, altitudeFt, time, turbulence, icing, raw };
}

/** Build a turbulence heatmap from PIREPs */
export function buildTurbulenceHeatmap(
  pireps: PIREP[],
  bbox: BoundingBox,
  options: { latBins?: number; lonBins?: number } = {},
): HeatmapCell[] {
  const turbulenceWeight: Record<string, number> = {
    NEG: 0, LGT: 1, MOD: 3, SEV: 6, EXTRM: 10,
  };

  return buildWeightedHeatmap(
    pireps.filter((p) => p.turbulence),
    bbox,
    (p) => turbulenceWeight[p.turbulence!] ?? 0,
    options,
  );
}

/** Build an icing risk heatmap from PIREPs */
export function buildIcingHeatmap(
  pireps: PIREP[],
  bbox: BoundingBox,
  options: { latBins?: number; lonBins?: number } = {},
): HeatmapCell[] {
  const icingWeight: Record<string, number> = {
    NEG: 0, TRC: 1, LGT: 2, MOD: 4, SEV: 8,
  };

  return buildWeightedHeatmap(
    pireps.filter((p) => p.icing),
    bbox,
    (p) => icingWeight[p.icing!] ?? 0,
    options,
  );
}

function buildWeightedHeatmap(
  pireps: PIREP[],
  bbox: BoundingBox,
  weightFn: (p: PIREP) => number,
  options: { latBins?: number; lonBins?: number },
): HeatmapCell[] {
  const latBins = options.latBins ?? 50;
  const lonBins = options.lonBins ?? 50;
  const latStep = (bbox.maxLat - bbox.minLat) / latBins;
  const lonStep = (bbox.maxLon - bbox.minLon) / lonBins;
  const grid = new Float64Array(latBins * lonBins);

  for (const p of pireps) {
    if (p.lat < bbox.minLat || p.lat > bbox.maxLat) continue;
    if (p.lon < bbox.minLon || p.lon > bbox.maxLon) continue;
    const row = Math.min(latBins - 1, Math.floor((p.lat - bbox.minLat) / latStep));
    const col = Math.min(lonBins - 1, Math.floor((p.lon - bbox.minLon) / lonStep));
    grid[row * lonBins + col] += weightFn(p);
  }

  const cells: HeatmapCell[] = [];
  for (let r = 0; r < latBins; r++) {
    for (let c = 0; c < lonBins; c++) {
      const value = grid[r * lonBins + c];
      if (value > 0) {
        cells.push({
          lat: bbox.minLat + (r + 0.5) * latStep,
          lon: bbox.minLon + (c + 0.5) * lonStep,
          value,
        });
      }
    }
  }
  return cells;
}

function parseCoord(num: string, dir: string): number {
  const val = parseInt(num) / (num.length === 5 ? 100 : 10);
  return dir === "S" || dir === "W" ? -val : val;
}
