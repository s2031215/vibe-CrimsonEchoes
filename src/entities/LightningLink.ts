// =============================================================================
// Lightning Link - Visual effect for chain lightning
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class LightningLink {
  public container: Container;
  private graphics: Graphics;
  private lifetime: number = 0;
  private maxLifetime: number = 0.2; // 200ms flash

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  /** Activate lightning link between two points */
  activate(from: Vec2, to: Vec2): void {
    this.lifetime = this.maxLifetime;
    this.container.visible = true;

    // Draw lightning bolt
    this.graphics.clear();
    this.graphics.moveTo(from.x, from.y);
    this.graphics.lineTo(to.x, to.y);
    this.graphics.stroke({ width: 2, color: 0xFFFF00 }); // Yellow lightning

    // Add glow effect
    this.graphics.moveTo(from.x, from.y);
    this.graphics.lineTo(to.x, to.y);
    this.graphics.stroke({ width: 4, color: 0xFFFFFF, alpha: 0.5 }); // White glow
  }

  /** Update link - fade out over time */
  update(dt: number): boolean {
    if (this.lifetime <= 0) return true; // Ready to remove

    this.lifetime -= dt;

    // Fade out
    const alpha = Math.max(0, this.lifetime / this.maxLifetime);
    this.container.alpha = alpha;

    if (this.lifetime <= 0) {
      this.container.visible = false;
      return true; // Remove
    }

    return false; // Keep active
  }

  /** Reset for pooling */
  reset(): void {
    this.lifetime = 0;
    this.container.visible = false;
    this.container.alpha = 1;
    this.graphics.clear();
  }
}
