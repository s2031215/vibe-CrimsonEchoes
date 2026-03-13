// =============================================================================
// Meteorite - Lingering damage area that expands from 0 to full radius on spawn
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

const EXPAND_DURATION = 1.0; // Seconds to animate from radius 0 to maxRadius

export class Meteorite {
  public container: Container;
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private lifetime: number = 0;
  private maxLifetime: number = 3.0;
  public position: Vec2 = { x: 0, y: 0 };
  public radius: number = 0;          // Current (animated) radius — used by collision
  private maxRadius: number = 60;     // Target radius after expansion
  private damageTickTimer: number = 0;
  private readonly damageTickRate: number = 0.5;
  private pulseTimer: number = 0;

  constructor() {
    this.container = new Container();

    this.glowGraphics = new Graphics();
    this.container.addChild(this.glowGraphics);

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.container.visible = false;
  }

  /** Activate meteorite at position. `maxRadius` is the fully-expanded radius. */
  activate(pos: Vec2, maxRadius: number, damage: number, duration: number): void {
    this.position = { x: pos.x, y: pos.y };
    this.maxRadius = maxRadius;
    this.radius = 0; // Start collapsed
    this.maxLifetime = duration;
    this.lifetime = 0;
    this.damageTickTimer = 0;
    this.pulseTimer = 0;
    this.container.visible = true;
    this.container.position.set(pos.x, pos.y);
    // damage is stored on the Meteorite for CollisionSystem to read
    (this as unknown as { damage: number }).damage = damage;
    this.drawMeteorite();
  }

  // Public damage field (CollisionSystem reads this)
  public damage: number = 1;

  /** Draw the meteorite area using the current animated radius */
  private drawMeteorite(): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    if (this.radius <= 0) return;

    // Pulsing glow effect
    const pulseScale = 1 + Math.sin(this.pulseTimer * 3) * 0.2;
    const glowRadius = this.radius * pulseScale;

    // Outer glow (orange/red)
    this.glowGraphics.circle(0, 0, glowRadius);
    this.glowGraphics.fill({ color: 0xFF4500, alpha: 0.2 });

    // Middle ring
    this.glowGraphics.circle(0, 0, glowRadius * 0.7);
    this.glowGraphics.fill({ color: 0xFF6600, alpha: 0.3 });

    // Main damage area
    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill({ color: 0xFF0000, alpha: 0.4 });

    // Inner core
    this.graphics.circle(0, 0, this.radius * 0.3);
    this.graphics.fill({ color: 0xFFFF00, alpha: 0.6 });

    // Border ring
    this.graphics.circle(0, 0, this.radius);
    this.graphics.stroke({ width: 2, color: 0xFF0000, alpha: 0.8 });
  }

  /** Update meteorite — expand radius over first second, then fade out */
  update(dt: number): boolean {
    if (!this.container.visible) return true;

    this.lifetime += dt;
    this.damageTickTimer += dt;
    this.pulseTimer += dt;

    // Animate radius: expand linearly from 0 to maxRadius over EXPAND_DURATION
    const expandT = Math.min(1, this.lifetime / EXPAND_DURATION);
    this.radius = expandT * this.maxRadius;

    // Fade out over lifetime (keep minimum visibility while expanding)
    const alpha = Math.max(0.3, 1 - (this.lifetime / this.maxLifetime));
    this.container.alpha = alpha;

    this.drawMeteorite();

    if (this.lifetime >= this.maxLifetime) {
      this.container.visible = false;
      return true;
    }

    return false;
  }

  /** Check if it's time to apply damage */
  shouldApplyDamage(): boolean {
    if (this.damageTickTimer >= this.damageTickRate) {
      this.damageTickTimer = 0;
      return true;
    }
    return false;
  }

  /** Reset for pooling */
  reset(): void {
    this.lifetime = 0;
    this.damageTickTimer = 0;
    this.pulseTimer = 0;
    this.radius = 0;
    this.maxRadius = 60;
    this.container.visible = false;
    this.container.alpha = 1;
    this.graphics.clear();
    this.glowGraphics.clear();
  }
}
