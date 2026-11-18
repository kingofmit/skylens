/** TAF forecast change type */
export type TAFChangeType = "FM" | "TEMPO" | "BECMG" | "PROB";

/** A single TAF forecast period */
export interface TAFForecast {
  from: number;
  to: number;
  windDir: number;
  windSpeedKts: number;
  visibility: number;
  ceiling: number | null;
  changeType: TAFChangeType;
}

/** Parsed Terminal Aerodrome Forecast */
export interface TAF {
  station: string;
  lat: number;
  lon: number;
  validFrom: number;
  validTo: number;
  forecasts: TAFForecast[];
  raw: string;
}

/** Parse a TAF string into structured data */
export function parseTAF(
  raw: string,
  stationLat: number = 0,
  stationLon: number = 0,
): TAF {
  const lines = raw.trim().replace(/\n\s+/g, " ").split(/\n/);
  const firstLine = lines[0] ?? "";
  const station = firstLine.match(/^TAF\s+(\w{4})/)?.[1] ?? firstLine.split(/\s+/)[1] ?? "";

  // Valid period: ddHH/ddHH
  let validFrom = 0;
  let validTo = 0;
  const validMatch = firstLine.match(/(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  if (validMatch) {
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setUTCDate(parseInt(validMatch[1]));
    fromDate.setUTCHours(parseInt(validMatch[2]), 0, 0, 0);
    validFrom = fromDate.getTime() / 1000;

    const toDate = new Date(now);
    toDate.setUTCDate(parseInt(validMatch[3]));
    toDate.setUTCHours(parseInt(validMatch[4]), 0, 0, 0);
    validTo = toDate.getTime() / 1000;
  }

  const fullText = lines.join(" ");
  const forecasts: TAFForecast[] = [];

  // Parse FM groups
  const fmMatches = fullText.matchAll(/FM(\d{2})(\d{2})(\d{2})\s+([^]*?)(?=FM\d|TEMPO|BECMG|PROB|$)/g);
  for (const match of fmMatches) {
    const from = parseTAFTime(match[1], match[2], match[3]);
    const { windDir, windSpeedKts, visibility, ceiling } = parseTAFBody(match[4]);
    forecasts.push({ from, to: validTo, windDir, windSpeedKts, visibility, ceiling, changeType: "FM" });
  }

  // Parse TEMPO groups
  const tempoMatches = fullText.matchAll(/TEMPO\s+(\d{2})(\d{2})\/(\d{2})(\d{2})\s+([^]*?)(?=FM\d|TEMPO|BECMG|PROB|$)/g);
  for (const match of tempoMatches) {
    const from = parseTAFPeriodTime(match[1], match[2]);
    const to = parseTAFPeriodTime(match[3], match[4]);
    const { windDir, windSpeedKts, visibility, ceiling } = parseTAFBody(match[5]);
    forecasts.push({ from, to, windDir, windSpeedKts, visibility, ceiling, changeType: "TEMPO" });
  }

  // Parse BECMG groups
  const becmgMatches = fullText.matchAll(/BECMG\s+(\d{2})(\d{2})\/(\d{2})(\d{2})\s+([^]*?)(?=FM\d|TEMPO|BECMG|PROB|$)/g);
  for (const match of becmgMatches) {
    const from = parseTAFPeriodTime(match[1], match[2]);
    const to = parseTAFPeriodTime(match[3], match[4]);
    const { windDir, windSpeedKts, visibility, ceiling } = parseTAFBody(match[5]);
    forecasts.push({ from, to, windDir, windSpeedKts, visibility, ceiling, changeType: "BECMG" });
  }

  forecasts.sort((a, b) => a.from - b.from);

  return { station, lat: stationLat, lon: stationLon, validFrom, validTo, forecasts, raw };
}

function parseTAFTime(dd: string, hh: string, mm: string): number {
  const now = new Date();
  now.setUTCDate(parseInt(dd));
  now.setUTCHours(parseInt(hh), parseInt(mm), 0, 0);
  return now.getTime() / 1000;
}

function parseTAFPeriodTime(dd: string, hh: string): number {
  return parseTAFTime(dd, hh, "00");
}

function parseTAFBody(body: string): {
  windDir: number;
  windSpeedKts: number;
  visibility: number;
  ceiling: number | null;
} {
  let windDir = 0;
  let windSpeedKts = 0;
  const windMatch = body.match(/(\d{3}|VRB)(\d{2,3})KT/);
  if (windMatch) {
    windDir = windMatch[1] === "VRB" ? 0 : parseInt(windMatch[1]);
    windSpeedKts = parseInt(windMatch[2]);
  }

  let visibility = 10;
  const visMatch = body.match(/(\d+)SM/);
  if (visMatch) visibility = parseInt(visMatch[1]);

  let ceiling: number | null = null;
  const ceilMatch = body.match(/(BKN|OVC|VV)(\d{3})/);
  if (ceilMatch) ceiling = parseInt(ceilMatch[2]) * 100;

  return { windDir, windSpeedKts, visibility, ceiling };
}
