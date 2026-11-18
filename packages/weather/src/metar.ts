/** Parsed METAR observation */
export interface METAR {
  station: string;
  lat: number;
  lon: number;
  time: number;
  windDir: number;
  windSpeedKts: number;
  windGustKts: number | null;
  visibility: number;
  ceiling: number | null;
  tempC: number;
  dewpointC: number;
  altimeterInHg: number;
  flightCategory: "VFR" | "MVFR" | "IFR" | "LIFR";
  raw: string;
}

/** Parse a standard METAR string */
export function parseMETAR(raw: string, stationLat: number = 0, stationLon: number = 0): METAR {
  const parts = raw.trim().split(/\s+/);
  const station = parts[0] ?? "";

  // Time: DDHHMMz
  let time = 0;
  const timeMatch = raw.match(/(\d{2})(\d{2})(\d{2})Z/);
  if (timeMatch) {
    const now = new Date();
    now.setUTCDate(parseInt(timeMatch[1]));
    now.setUTCHours(parseInt(timeMatch[2]), parseInt(timeMatch[3]), 0, 0);
    time = now.getTime() / 1000;
  }

  // Wind: dddffGggKT or dddffKT or VRB
  let windDir = 0;
  let windSpeedKts = 0;
  let windGustKts: number | null = null;
  const windMatch = raw.match(/(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT/);
  if (windMatch) {
    windDir = windMatch[1] === "VRB" ? 0 : parseInt(windMatch[1]);
    windSpeedKts = parseInt(windMatch[2]);
    windGustKts = windMatch[4] ? parseInt(windMatch[4]) : null;
  }

  // Visibility (statute miles)
  let visibility = 10;
  const visMatch = raw.match(/\s(\d+)\s?SM/);
  if (visMatch) visibility = parseInt(visMatch[1]);
  const visFracMatch = raw.match(/\s(\d+)\/(\d+)SM/);
  if (visFracMatch) visibility = parseInt(visFracMatch[1]) / parseInt(visFracMatch[2]);

  // Ceiling: BKN/OVC/VV layers
  let ceiling: number | null = null;
  const ceilingMatch = raw.match(/(BKN|OVC|VV)(\d{3})/);
  if (ceilingMatch) ceiling = parseInt(ceilingMatch[2]) * 100;

  // Temperature/dewpoint: TT/DD (possibly M prefix for negative)
  let tempC = 0;
  let dewpointC = 0;
  const tempMatch = raw.match(/\s(M?\d{2})\/(M?\d{2})\s/);
  if (tempMatch) {
    tempC = parseMETARTemp(tempMatch[1]);
    dewpointC = parseMETARTemp(tempMatch[2]);
  }

  // Altimeter: Annnn
  let altimeterInHg = 29.92;
  const altMatch = raw.match(/A(\d{4})/);
  if (altMatch) altimeterInHg = parseInt(altMatch[1]) / 100;

  const flightCategory = classifyFlightCategory(visibility, ceiling);

  return {
    station,
    lat: stationLat,
    lon: stationLon,
    time,
    windDir,
    windSpeedKts,
    windGustKts,
    visibility,
    ceiling,
    tempC,
    dewpointC,
    altimeterInHg,
    flightCategory,
    raw,
  };
}

/** Parse Aviation Weather Center CSV format */
export function parseAWC_METAR_CSV(csv: string): METAR[] {
  const lines = csv.trim().split("\n");
  const results: METAR[] = [];

  // Find header line
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("raw_text")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;

  const headers = lines[headerIdx].split(",");
  const rawIdx = headers.indexOf("raw_text");
  const latIdx = headers.indexOf("latitude");
  const lonIdx = headers.indexOf("longitude");

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length <= rawIdx) continue;
    const raw = cols[rawIdx];
    const lat = latIdx >= 0 ? parseFloat(cols[latIdx]) : 0;
    const lon = lonIdx >= 0 ? parseFloat(cols[lonIdx]) : 0;
    if (raw) results.push(parseMETAR(raw, lat, lon));
  }

  return results;
}

function parseMETARTemp(s: string): number {
  if (s.startsWith("M")) return -parseInt(s.slice(1));
  return parseInt(s);
}

function classifyFlightCategory(
  visibilitySM: number,
  ceilingFt: number | null,
): "VFR" | "MVFR" | "IFR" | "LIFR" {
  const ceil = ceilingFt ?? Infinity;
  if (visibilitySM < 1 || ceil < 500) return "LIFR";
  if (visibilitySM < 3 || ceil < 1000) return "IFR";
  if (visibilitySM <= 5 || ceil <= 3000) return "MVFR";
  return "VFR";
}
