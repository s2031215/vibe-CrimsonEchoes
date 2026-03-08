// =============================================================================
// Meteorite - Lingering damage area
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class Meteorite {
  public container: Container;
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private lifetime: number = 0;
  private maxLifetime: number = 3.0; // 3 seconds of lingering damage
  public position: Vec2 = { x: 0, y: 0 };
  public radius: number = 60;
  public damage: number = 1;
  private damageTickTimer: number = 0;
  private damageTickRate: number = 0.5; // Damage every 0.5 seconds
  private pulseTimer: number = 0;

  constructor() {
    this.container = new Container();
    
    // Glow effect (behind main graphics)
    this.glowGraphics = new Graphics();
    this.container.addChild(this.glowGraphics);
    
    // Main graphics
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    this.container.visible = false;
  }

  /** Activate meteorite at position */
  activate(pos: Vec2, radius: number, damage: number, duration: number): void {
    this.position = { x: pos.x, y: pos.y };
    this.radius = radius;
    this.damage = damage;
    this.maxLifetime = duration;
    this.lifetime = 0;
    this.damageTickTimer = 0;
    this.pulseTimer = 0;
    this.container.visible = true;
    this.container.position.set(pos.x, pos.y);
    this.drawMeteorite();
  }

  /** Draw the meteorite area */
  private drawMeteorite(): void {
    this.graphics.clear();
    this.glowGraphics.clear();
    
    // Pulsing glow effect
    const pulseScale = 1 + Math.sin(this.pulseTimer * 3) * 0.2;
    const glowRadius = this.radius * pulseScale;
    
    // Outer glow (orange/red)
    this.glowGraphics.circle(0, 0, glowRadius);
    this.glowGraphics.fill({ color: 0xFF4500, alpha: 0.2 }); // Orange-red glow
    
    // Middle ring
    this.glowGraphics.circle(0, 0, glowRadius * 0.7);
    this.glowGraphics.fill({ color: 0xFF6600, alpha: 0.3 }); // Bright orange
    
    // Main damage area
    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill({ color: 0xFF0000, alpha: 0.4 }); // Red damage area
    
    // Inner core
    this.graphics.circle(0, 0, this.radius * 0.3);
    this.graphics.fill({ color: 0xFFFF00, alpha: 0.6 }); // Yellow hot core
    
    // Border ring
    this.graphics.circle(0, 0, this.radius);
    this.graphics.stroke({ width: 2, color: 0xFF0000, alpha: 0.8 }); // Red border
  }

  /** Update meteorite - fade out and pulse */
  update(dt: number): boolean {
    if (!this.container.visible) return true;

    this.lifetime += dt;
    this.damageTickTimer += dt;
    this.pulseTimer += dt;

    // Fade out over lifetime
    const alpha = Math.max(0.3, 1 - (this.lifetime / this.maxLifetime));
    this.container.alpha = alpha;

    // Redraw for pulsing effect
    this.drawMeteorite();

    if (this.lifetime >= this.maxLifetime) {
      this.container.visible = false;
      return true; // Remove
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
    this.container.visible = false;
    this.container.alpha = 1;
    this.graphics.clear();
    this.glowGraphics.clear();
  }
}
