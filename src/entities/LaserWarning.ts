// =============================================================================
// Laser Warning Marker - Visual warning before laser fires
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class LaserWarning {
  public container: Container;
  private graphics: Graphics;
  private lifetime: number = 0;
  private maxLifetime: number = 1.0; // 1 second warning
  public targetPos: Vec2 = { x: 0, y: 0 };
  public sourcePos: Vec2 = { x: 0, y: 0 };

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  /** Activate warning marker */
  activate(from: Vec2, to: Vec2, duration: number = 1.0): void {
    this.sourcePos = { x: from.x, y: from.y };
    this.targetPos = { x: to.x, y: to.y };
    this.maxLifetime = duration;
    this.lifetime = 0;
    this.container.visible = true;
    this.drawWarning();
  }

  /** Draw the warning line */
  private drawWarning(): void {
    this.graphics.clear();
    
    // Draw warning line from boss to target
    this.graphics.moveTo(this.sourcePos.x, this.sourcePos.y);
    this.graphics.lineTo(this.targetPos.x, this.targetPos.y);
    this.graphics.stroke({ width: 2, color: 0xFF0000, alpha: 0.5 }); // Red warning line
    
    // Draw target marker
    this.graphics.circle(this.targetPos.x, this.targetPos.y, 8);
    this.graphics.stroke({ width: 2, color: 0xFF0000 });
    
    // Cross marker at target
    this.graphics.moveTo(this.targetPos.x - 6, this.targetPos.y);
    this.graphics.lineTo(this.targetPos.x + 6, this.targetPos.y);
    this.graphics.moveTo(this.targetPos.x, this.targetPos.y - 6);
    this.graphics.lineTo(this.targetPos.x, this.targetPos.y + 6);
    this.graphics.stroke({ width: 2, color: 0xFF0000 });
  }

  /** Update warning - pulse and countdown */
  update(dt: number): boolean {
    if (!this.container.visible) return true;

    this.lifetime += dt;

    // Pulse effect
    const pulseSpeed = 8;
    const pulse = Math.sin(this.lifetime * pulseSpeed);
    this.container.alpha = 0.5 + pulse * 0.3;

    // Check if warning expired
    if (this.lifetime >= this.maxLifetime) {
      this.container.visible = false;
      return true; // Ready to fire laser
    }

    return false;
  }

  /** Get remaining warning time */
  getRemainingTime(): number {
    return Math.max(0, this.maxLifetime - this.lifetime);
  }

  /** Reset for pooling */
  reset(): void {
    this.lifetime = 0;
    this.container.visible = false;
    this.container.alpha = 1;
    this.graphics.clear();
  }
}
