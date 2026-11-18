import { METAR } from "./metar";

/** Wind barb data for visualization */
export interface WindBarb {
  lat: number;
  lon: number;
  directionDeg: number;
  speedKts: number;
}

/** Wind barb geometry for SVG/canvas rendering */
export interface WindBarbGeometry {
  shaft: [number, number][];
  flags: [number, number][][];
  pennants: [number, number][][];
}

/** Convert METARs to wind barb data */
export function metarToWindBarbs(metars: METAR[]): WindBarb[] {
  return metars
    .filter((m) => m.windSpeedKts > 0)
    .map((m) => ({
      lat: m.lat,
      lon: m.lon,
      directionDeg: m.windDir,
      speedKts: m.windSpeedKts,
    }));
}

/** Generate SVG-ready geometry for a wind barb */
export function windBarbGeometry(barb: WindBarb): WindBarbGeometry {
  const shaftLen = 40;
  const flagLen = 15;
  const pennantLen = 15;
  const spacing = 5;

  // Rotate so 0° = north (up), clockwise
  const angle = ((barb.directionDeg + 180) % 360) * (Math.PI / 180);

  const shaft: [number, number][] = [
    [0, 0],
    [Math.sin(angle) * shaftLen, -Math.cos(angle) * shaftLen],
  ];

  const flags: [number, number][][] = [];
  const pennants: [number, number][][] = [];

  let remaining = barb.speedKts;
  let position = shaftLen;
  const perpAngle = angle + Math.PI / 2;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const pdx = Math.sin(perpAngle);
  const pdy = -Math.cos(perpAngle);

  // Pennants (50 kt triangles)
  while (remaining >= 50) {
    const base: [number, number] = [dx * position, dy * position];
    const tip: [number, number] = [
      dx * (position - spacing) + pdx * pennantLen,
      dy * (position - spacing) + pdy * pennantLen,
    ];
    const back: [number, number] = [dx * (position - spacing * 2), dy * (position - spacing * 2)];
    pennants.push([base, tip, back]);
    position -= spacing * 2;
    remaining -= 50;
  }

  // Long barbs (10 kt lines)
  while (remaining >= 10) {
    const base: [number, number] = [dx * position, dy * position];
    const tip: [number, number] = [
      dx * position + pdx * flagLen,
      dy * position + pdy * flagLen,
    ];
    flags.push([base, tip]);
    position -= spacing;
    remaining -= 10;
  }

  // Short barb (5 kt half-line)
  if (remaining >= 5) {
    const base: [number, number] = [dx * position, dy * position];
    const tip: [number, number] = [
      dx * position + pdx * (flagLen / 2),
      dy * position + pdy * (flagLen / 2),
    ];
    flags.push([base, tip]);
  }

  return { shaft, flags, pennants };
}
