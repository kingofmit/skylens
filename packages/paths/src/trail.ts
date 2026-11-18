import { Color, Position3D } from "@skylens-aviation/core";

export type ColorMode = "altitude" | "speed" | "vrate" | "solid";

export interface TrailStyle {
  colorMode: ColorMode;
  solidColor?: Color;
  width: number;
  opacity: number;
  fadeLength: number;
}

/** Map a value to a color using a gradient (blue → green → yellow → red) */
export function valueToColor(value: number, min: number, max: number): Color {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  if (t < 0.33) {
    const s = t / 0.33;
    return { r: 0, g: Math.round(255 * s), b: Math.round(255 * (1 - s)), a: 1 };
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return { r: Math.round(255 * s), g: 255, b: 0, a: 1 };
  } else {
    const s = (t - 0.66) / 0.34;
    return { r: 255, g: Math.round(255 * (1 - s)), b: 0, a: 1 };
  }
}

/** Generate trail vertex colors for a path */
export function generateTrailColors(
  values: number[],
  style: TrailStyle,
): Color[] {
  if (style.colorMode === "solid") {
    return values.map(() => style.solidColor ?? { r: 0, g: 150, b: 255, a: 1 });
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v, i) => {
    const color = valueToColor(v, min, max);
    const fade = style.fadeLength > 0
      ? Math.min(1, (values.length - i) / style.fadeLength)
      : 1;
    return { ...color, a: style.opacity * fade };
  });
}
