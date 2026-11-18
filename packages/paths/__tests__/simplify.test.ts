import { describe, it, expect } from "vitest";
import { simplifyPath } from "../src/simplify";
import { Position3D } from "@skylens-aviation/core";

describe("simplifyPath (RDP)", () => {
  it("should not reduce a straight line", () => {
    const points: Position3D[] = Array.from({ length: 10 }, (_, i) => ({
      x: i * 10,
      y: 0,
      z: 0,
    }));
    const simplified = simplifyPath(points, 1);
    expect(simplified).toHaveLength(2); // Start and end only
  });

  it("should reduce a noisy path with large epsilon", () => {
    const points: Position3D[] = Array.from({ length: 20 }, (_, i) => ({
      x: i * 100,
      y: i % 2 === 0 ? 0 : 5,
      z: 0,
    }));
    // With epsilon=10, the small 5-unit zigzag should be smoothed out
    const simplified = simplifyPath(points, 10);
    expect(simplified).toHaveLength(2); // Flattened to just start/end
  });

  it("should return both points for a two-point path", () => {
    const points: Position3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ];
    expect(simplifyPath(points, 1)).toHaveLength(2);
  });
});
