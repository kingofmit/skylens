export const PHASE_COLORS: Record<string, string> = {
  ground: "#6b7280",
  takeoff: "#f59e0b",
  climb: "#3b82f6",
  cruise: "#10b981",
  descent: "#8b5cf6",
  approach: "#ec4899",
  landing: "#ef4444",
};

export const CATEGORY_COLORS: Record<string, string> = {
  VFR: "#10b981",
  MVFR: "#3b82f6",
  IFR: "#ef4444",
  LIFR: "#7c3aed",
};

export const HEATMAP_GRADIENT = [
  [0, 0, 255, 0],      // transparent blue
  [0, 255, 0, 100],    // green
  [255, 255, 0, 160],  // yellow
  [255, 0, 0, 220],    // red
];
