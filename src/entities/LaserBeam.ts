// =============================================================================
// Laser Beam - Instant damage beam
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class LaserBeam {
  public container: Container;
  private graphics: Graphics;
  private lifetime: number = 0;
  private maxLifetime: number = 0.3; // 300ms beam duration
  public sourcePos: Vec2 = { x: 0, y: 0 };
  public targetPos: Vec2 = { x: 0, y: 0 };
  public damage: number = 2;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  /** Activate laser beam */
  activate(from: Vec2, to: Vec2, damage: number): void {
    this.sourcePos = { x: from.x, y: from.y };
    this.targetPos = { x: to.x, y: to.y };
    this.damage = damage;
    this.lifetime = 0;
    this.container.visible = true;
    this.drawBeam();
  }

  /** Draw the laser beam */
  private drawBeam(): void {
    this.graphics.clear();
    
    // Outer glow
    this.graphics.moveTo(this.sourcePos.x, this.sourcePos.y);
    this.graphics.lineTo(this.targetPos.x, this.targetPos.y);
    this.graphics.stroke({ width: 12, color: 0x00FFFF, alpha: 0.3 }); // Cyan glow
    
    // Middle beam
    this.graphics.moveTo(this.sourcePos.x, this.sourcePos.y);
    this.graphics.lineTo(this.targetPos.x, this.targetPos.y);
    this.graphics.stroke({ width: 6, color: 0x00FFFF, alpha: 0.7 }); // Cyan beam
    
    // Core beam
    this.graphics.moveTo(this.sourcePos.x, this.sourcePos.y);
    this.graphics.lineTo(this.targetPos.x, this.targetPos.y);
    this.graphics.stroke({ width: 2, color: 0xFFFFFF }); // White core
  }

  /** Update beam - fade out */
  update(dt: number): boolean {
    if (!this.container.visible) return true;

    this.lifetime += dt;

    // Fade out
    const alpha = Math.max(0, 1 - (this.lifetime / this.maxLifetime));
    this.container.alpha = alpha;

    if (this.lifetime >= this.maxLifetime) {
      this.container.visible = false;
      return true; // Remove
    }

    return false;
  }

  /** Reset for pooling */
  reset(): void {
    this.lifetime = 0;
    this.container.visible = false;
    this.container.alpha = 1;
    this.graphics.clear();
  }
}
