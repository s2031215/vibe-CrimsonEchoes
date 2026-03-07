// =============================================================================
// Math Utilities Tests
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  vec2,
  add,
  subtract,
  scale,
  length,
  lengthSquared,
  distance,
  distanceSquared,
  normalize,
  clamp,
  lerp,
  randomRange,
  randomInt,
  randomPick,
  circlesCollide,
} from "@utils/math";

describe("vec2", () => {
  it("creates a vector with default values", () => {
    const v = vec2();
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it("creates a vector with specified values", () => {
    const v = vec2(3, 4);
    expect(v).toEqual({ x: 3, y: 4 });
  });
});

describe("add", () => {
  it("adds two vectors", () => {
    const result = add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(result).toEqual({ x: 4, y: 6 });
  });

  it("handles negative values", () => {
    const result = add({ x: -1, y: 2 }, { x: 3, y: -4 });
    expect(result).toEqual({ x: 2, y: -2 });
  });

  it("handles zero vectors", () => {
    const result = add({ x: 0, y: 0 }, { x: 5, y: 5 });
    expect(result).toEqual({ x: 5, y: 5 });
  });
});

describe("subtract", () => {
  it("subtracts vector b from a", () => {
    const result = subtract({ x: 5, y: 7 }, { x: 2, y: 3 });
    expect(result).toEqual({ x: 3, y: 4 });
  });

  it("handles negative results", () => {
    const result = subtract({ x: 1, y: 1 }, { x: 5, y: 5 });
    expect(result).toEqual({ x: -4, y: -4 });
  });
});

describe("scale", () => {
  it("multiplies vector by scalar", () => {
    const result = scale({ x: 2, y: 3 }, 3);
    expect(result).toEqual({ x: 6, y: 9 });
  });

  it("handles zero scalar", () => {
    const result = scale({ x: 5, y: 5 }, 0);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("handles negative scalar", () => {
    const result = scale({ x: 2, y: 3 }, -2);
    expect(result).toEqual({ x: -4, y: -6 });
  });
});

describe("length", () => {
  it("calculates length of a 3-4-5 triangle", () => {
    const result = length({ x: 3, y: 4 });
    expect(result).toBe(5);
  });

  it("returns 0 for zero vector", () => {
    const result = length({ x: 0, y: 0 });
    expect(result).toBe(0);
  });

  it("handles unit vectors", () => {
    const result = length({ x: 1, y: 0 });
    expect(result).toBe(1);
  });
});

describe("lengthSquared", () => {
  it("calculates squared length", () => {
    const result = lengthSquared({ x: 3, y: 4 });
    expect(result).toBe(25);
  });

  it("returns 0 for zero vector", () => {
    const result = lengthSquared({ x: 0, y: 0 });
    expect(result).toBe(0);
  });
});

describe("distance", () => {
  it("calculates distance between two points", () => {
    const result = distance({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(result).toBe(5);
  });

  it("returns 0 for same point", () => {
    const result = distance({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(result).toBe(0);
  });
});

describe("distanceSquared", () => {
  it("calculates squared distance between two points", () => {
    const result = distanceSquared({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(result).toBe(25);
  });
});

describe("normalize", () => {
  it("normalizes a vector to unit length", () => {
    const result = normalize({ x: 3, y: 4 });
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });

  it("returns zero vector for zero input", () => {
    const result = normalize({ x: 0, y: 0 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("normalizes unit vector to itself", () => {
    const result = normalize({ x: 1, y: 0 });
    expect(result).toEqual({ x: 1, y: 0 });
  });
});

describe("clamp", () => {
  it("clamps value below minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps value above maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it("returns value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("handles edge cases at boundaries", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("lerp", () => {
  it("returns start value at t=0", () => {
    expect(lerp(0, 100, 0)).toBe(0);
  });

  it("returns end value at t=1", () => {
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it("handles negative values", () => {
    expect(lerp(-100, 100, 0.5)).toBe(0);
  });
});

describe("randomRange", () => {
  it("returns value within range", () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
    }
  });

  it("handles negative ranges", () => {
    for (let i = 0; i < 100; i++) {
      const result = randomRange(-10, -5);
      expect(result).toBeGreaterThanOrEqual(-10);
      expect(result).toBeLessThan(-5);
    }
  });
});

describe("randomInt", () => {
  it("returns integer within range (inclusive)", () => {
    const results = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const result = randomInt(1, 3);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(3);
      results.add(result);
    }
    // Should hit all values eventually
    expect(results.has(1)).toBe(true);
    expect(results.has(2)).toBe(true);
    expect(results.has(3)).toBe(true);
  });
});

describe("randomPick", () => {
  it("returns undefined for empty array", () => {
    expect(randomPick([])).toBeUndefined();
  });

  it("returns the only element for single-item array", () => {
    expect(randomPick(["only"])).toBe("only");
  });

  it("returns element from array", () => {
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 100; i++) {
      const result = randomPick(arr);
      expect(arr).toContain(result);
    }
  });
});

describe("circlesCollide", () => {
  it("detects overlapping circles", () => {
    expect(circlesCollide({ x: 0, y: 0 }, 5, { x: 8, y: 0 }, 5)).toBe(true);
  });

  it("detects touching circles", () => {
    expect(circlesCollide({ x: 0, y: 0 }, 5, { x: 10, y: 0 }, 5)).toBe(true);
  });

  it("detects non-overlapping circles", () => {
    expect(circlesCollide({ x: 0, y: 0 }, 5, { x: 20, y: 0 }, 5)).toBe(false);
  });

  it("detects concentric circles", () => {
    expect(circlesCollide({ x: 5, y: 5 }, 10, { x: 5, y: 5 }, 5)).toBe(true);
  });

  it("handles diagonal collision", () => {
    // Distance between (0,0) and (3,4) is 5, so r1=3 + r2=3 = 6 > 5, should collide
    expect(circlesCollide({ x: 0, y: 0 }, 3, { x: 3, y: 4 }, 3)).toBe(true);
  });

  it("handles diagonal non-collision", () => {
    // Distance between (0,0) and (3,4) is 5, so r1=2 + r2=2 = 4 < 5, should not collide
    expect(circlesCollide({ x: 0, y: 0 }, 2, { x: 3, y: 4 }, 2)).toBe(false);
  });
});
