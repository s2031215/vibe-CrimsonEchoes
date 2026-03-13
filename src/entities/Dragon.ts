// =============================================================================
// Dragon - Electric lightning arc that flies from chain lightning target toward player
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

const ARC_LENGTH = 60; // Half-length each side of center (total bolt = 120px)
const ARC_SEGMENTS = 8; // Number of jagged segments
const TRAIL_MAX = 14;

export class Dragon {
  public container: Container;
  private graphics: Graphics;
  private trailGraphics: Graphics;
  public position: Vec2 = { x: 0, y: 0 };
  public velocity: Vec2 = { x: 0, y: 0 };
  public damage: number = 1;
  public radius: number = 20;
  private trailPositions: Vec2[] = [];
  private animationTimer: number = 0;
  private readonly maxTrailPositions = TRAIL_MAX;

  // Jitter offsets re-randomised each frame for flickering electricity
  private jitter: number[] = [];

  constructor() {
    this.container = new Container();

    this.trailGraphics = new Graphics();
    this.container.addChild(this.trailGraphics);

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.container.visible = false;
    this.regenerateJitter();
  }

  /** Randomise the perpendicular offsets for the jagged bolt */
  private regenerateJitter(): void {
    this.jitter = [];
    for (let i = 0; i < ARC_SEGMENTS - 1; i++) {
      // Max jitter scales with segment count so it looks proportional
      this.jitter.push((Math.random() - 0.5) * ARC_LENGTH * 0.55);
    }
  }

  /** Activate arc at position, flying toward target */
  activate(pos: Vec2, target: Vec2, damage: number, speed: number): void {
    this.position = { x: pos.x, y: pos.y };
    this.damage = damage;

    const dx = target.x - pos.x;
    const dy = target.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.velocity.x = (dx / dist) * speed;
      this.velocity.y = (dy / dist) * speed;
    } else {
      this.velocity.x = 0;
      this.velocity.y = speed;
    }

    this.trailPositions = [];
    this.animationTimer = 0;
    this.container.visible = true;
    this.regenerateJitter();
    this.drawArc();
  }

  /** Draw the jagged lightning arc oriented along the travel direction */
  private drawArc(): void {
    this.graphics.clear();

    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    // Perpendicular direction for jitter offsets
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Build points: tail → head along travel axis, with perpendicular jitter
    // Tail is at -ARC_LENGTH along the travel direction from center
    // Head is at +ARC_LENGTH
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS; // 0 → 1
      const along = -ARC_LENGTH + t * ARC_LENGTH * 2; // -60 → +60
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const bx = cosA * along;
      const by = sinA * along;

      // Interior points get jitter; endpoints are exact
      const j = i === 0 || i === ARC_SEGMENTS ? 0 : (this.jitter[i - 1] ?? 0);
      points.push({ x: bx + perpX * j, y: by + perpY * j });
    }

    // Outer glow — thick cyan
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 8, color: 0x00CCFF, alpha: 0.35 });

    // Mid layer — brighter cyan
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 4, color: 0x00FFFF, alpha: 0.75 });

    // Core — white
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 1.5, color: 0xFFFFFF, alpha: 1.0 });

    // Leading tip glow: small bright circle at the head end
    const head = points[ARC_SEGMENTS]!;
    this.graphics.circle(head.x, head.y, 4);
    this.graphics.fill({ color: 0xFFFFFF, alpha: 0.9 });
    this.graphics.circle(head.x, head.y, 7);
    this.graphics.fill({ color: 0x00FFFF, alpha: 0.4 });
  }

  /** Draw fading cyan trail */
  private drawTrail(): void {
    this.trailGraphics.clear();
    if (this.trailPositions.length < 2) return;

    for (let i = 0; i < this.trailPositions.length - 1; i++) {
      const p1 = this.trailPositions[i];
      const p2 = this.trailPositions[i + 1];
      if (!p1 || !p2) continue;

      const alpha = ((i + 1) / this.trailPositions.length) * 0.5;
      const width = 1 + ((i + 1) / this.trailPositions.length) * 5;

      this.trailGraphics.moveTo(
        p1.x - this.position.x,
        p1.y - this.position.y
      );
      this.trailGraphics.lineTo(
        p2.x - this.position.x,
        p2.y - this.position.y
      );
      this.trailGraphics.stroke({ width, color: 0x00FFFF, alpha });
    }
  }

  /** Update arc movement and animation */
  update(dt: number, screenWidth: number, screenHeight: number): boolean {
    if (!this.container.visible) return true;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.container.position.set(this.position.x, this.position.y);

    this.animationTimer += dt;

    // Re-randomise jitter every ~3 frames (≈50ms) for flicker
    if (Math.floor(this.animationTimer * 20) % 3 === 0) {
      this.regenerateJitter();
    }

    this.trailPositions.push({ x: this.position.x, y: this.position.y });
    if (this.trailPositions.length > this.maxTrailPositions) {
      this.trailPositions.shift();
    }

    this.drawArc();
    this.drawTrail();

    if (
      this.position.x < -100 ||
      this.position.x > screenWidth + 100 ||
      this.position.y < -100 ||
      this.position.y > screenHeight + 100
    ) {
      this.container.visible = false;
      return true;
    }

    return false;
  }

  /** Reset for pooling */
  reset(): void {
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.trailPositions = [];
    this.animationTimer = 0;
    this.container.visible = false;
    this.graphics.clear();
    this.trailGraphics.clear();
    this.regenerateJitter();
  }
}
