// =============================================================================
// Math Utilities
// =============================================================================

import type { Vec2 } from "@/types";

/** Create a new vector */
export function vec2(x: number = 0, y: number = 0): Vec2 {
  return { x, y };
}

/** Add two vectors */
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract vector b from a */
export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Multiply vector by scalar */
export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

/** Get vector length */
export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Get squared length (faster, no sqrt) */
export function lengthSquared(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

/** Get distance between two points */
export function distance(a: Vec2, b: Vec2): number {
  return length(subtract(a, b));
}

/** Get squared distance (faster, no sqrt) */
export function distanceSquared(a: Vec2, b: Vec2): number {
  return lengthSquared(subtract(a, b));
}

/** Normalize vector to unit length */
export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Random float between min and max */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer between min and max (inclusive) */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

/** Pick random element from array */
export function randomPick<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[randomInt(0, arr.length - 1)];
}

/** Check circle-circle collision */
export function circlesCollide(
  a: Vec2,
  radiusA: number,
  b: Vec2,
  radiusB: number
): boolean {
  const minDist = radiusA + radiusB;
  return distanceSquared(a, b) <= minDist * minDist;
}
