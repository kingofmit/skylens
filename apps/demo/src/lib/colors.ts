export const PHASE_COLORS: Record<string, string> = {
  ground: "#6b7280",
  takeoff: "#ff9100",
  climb: "#00e5ff",
  cruise: "#39ff14",
  descent: "#b388ff",
  approach: "#ff4081",
  landing: "#ff5252",
};

export const CATEGORY_COLORS: Record<string, string> = {
  VFR: "#39ff14",
  MVFR: "#00e5ff",
  IFR: "#ff5252",
  LIFR: "#b388ff",
};

export const HEATMAP_GRADIENT = [
  [0, 0, 255, 0],      // transparent blue
  [0, 255, 0, 100],    // green
  [255, 255, 0, 160],  // yellow
  [255, 0, 0, 220],    // red
];
