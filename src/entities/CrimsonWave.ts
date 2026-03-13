// =============================================================================
// CrimsonWave - T3 Shotgun: expanding 120° fan cone shockwave
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class CrimsonWave {
  public container: Container;
  private graphics: Graphics;

  // World-space origin (player position at fire time)
  public position: Vec2 = { x: 0, y: 0 };
  // Center angle of the cone (radians, toward nearest enemy)
  public angle: number = 0;
  // Half-spread of cone (radians) — 60° = full 120° cone
  public halfAngle: number = Math.PI / 3;
  // Current expansion radius
  public radius: number = 0;
  // Maximum expansion radius
  public maxRadius: number = 200;
  // Current lifetime elapsed
  private lifetime: number = 0;
  // Total lifetime
  private maxLifetime: number = 0.8;
  // Whether this wave is currently active
  public active: boolean = false;
  // Damage dealt to each enemy inside the cone
  public damage: number = 1;
  // Enemies already hit this pulse — prevents multi-hit
  public hitEnemies: Set<object> = new Set();

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  /** Activate the wave */
  activate(
    pos: Vec2,
    angle: number,
    damage: number,
    maxRadius: number = 200,
    maxLifetime: number = 0.8,
    halfAngle: number = Math.PI / 3
  ): void {
    this.position = { x: pos.x, y: pos.y };
    this.angle = angle;
    this.damage = damage;
    this.maxRadius = maxRadius;
    this.maxLifetime = maxLifetime;
    this.halfAngle = halfAngle;
    this.lifetime = 0;
    this.radius = 0;
    this.active = true;
    this.hitEnemies = new Set();
    this.container.position.set(pos.x, pos.y);
    this.container.visible = true;
    this.redraw();
  }

  /** Update expansion. Returns true when the wave is done. */
  update(dt: number): boolean {
    if (!this.active) return true;

    this.lifetime += dt;
    if (this.lifetime >= this.maxLifetime) {
      this.active = false;
      this.container.visible = false;
      return true;
    }

    const t = this.lifetime / this.maxLifetime;
    this.radius = t * this.maxRadius;
    this.redraw();
    return false;
  }

  /** Redraw the fan cone using PixiJS Graphics */
  private redraw(): void {
    this.graphics.clear();

    const r = this.radius;
    if (r < 1) return;

    const a = this.angle;
    const ha = this.halfAngle;
    // fade = 1 at start, 0 at end — cone fades as it expands
    const fade = 1 - this.lifetime / this.maxLifetime;

    const aStart = a - ha;
    const aEnd = a + ha;

    // --- Layer 1: Filled sector (crimson, very transparent) ---
    this.graphics.moveTo(0, 0);
    this.graphics.arc(0, 0, r, aStart, aEnd);
    this.graphics.closePath();
    this.graphics.fill({ color: 0xCC1133, alpha: 0.22 * fade });

    // --- Layer 2: Inner glow sector (slightly smaller, brighter) ---
    const innerR = r * 0.65;
    this.graphics.moveTo(0, 0);
    this.graphics.arc(0, 0, innerR, aStart, aEnd);
    this.graphics.closePath();
    this.graphics.fill({ color: 0xFF3366, alpha: 0.18 * fade });

    // --- Layer 3: Arc leading edge stroke ---
    this.graphics.arc(0, 0, r, aStart, aEnd);
    this.graphics.stroke({ width: 2.5, color: 0xFF3366, alpha: 0.75 * fade });

    // --- Layer 4: Two cone-edge lines from origin ---
    const lx1 = Math.cos(aStart) * r;
    const ly1 = Math.sin(aStart) * r;
    const lx2 = Math.cos(aEnd) * r;
    const ly2 = Math.sin(aEnd) * r;

    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(lx1, ly1);
    this.graphics.stroke({ width: 1.5, color: 0xFFAAAA, alpha: 0.5 * fade });

    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(lx2, ly2);
    this.graphics.stroke({ width: 1.5, color: 0xFFAAAA, alpha: 0.5 * fade });

    // --- Layer 5: Bright center origin flash (only in early expansion) ---
    if (this.lifetime < this.maxLifetime * 0.25) {
      const flashFade = 1 - this.lifetime / (this.maxLifetime * 0.25);
      this.graphics.circle(0, 0, 6 + r * 0.05);
      this.graphics.fill({ color: 0xFF6688, alpha: 0.6 * flashFade });
    }
  }

  /** Reset for pooling */
  reset(): void {
    this.active = false;
    this.lifetime = 0;
    this.radius = 0;
    this.hitEnemies = new Set();
    this.graphics.clear();
    this.container.visible = false;
  }
}
