// =============================================================================
// Lightning Link - Visual effect for chain lightning
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

const LINK_SEGMENTS = 8; // Number of jagged segments (7 interior jitter points)

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

    this.graphics.clear();
    this.drawJaggedArc(from, to);
  }

  /** Draw a jagged 3-layer cyan arc between two world-space points */
  private drawJaggedArc(from: Vec2, to: Vec2): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular unit vector for jitter offsets
    const px = len > 0 ? -dy / len : 0;
    const py = len > 0 ? dx / len : 0;

    // Build jagged points: endpoints are exact, interior points get random perpendicular offset
    const points: { x: number; y: number }[] = [{ x: from.x, y: from.y }];
    for (let s = 1; s < LINK_SEGMENTS; s++) {
      const t = s / LINK_SEGMENTS;
      const jitter = (Math.random() - 0.5) * len * 0.28;
      points.push({
        x: from.x + dx * t + px * jitter,
        y: from.y + dy * t + py * jitter,
      });
    }
    points.push({ x: to.x, y: to.y });

    // Outer glow — thick cyan
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 6, color: 0x00CCFF, alpha: 0.35 });

    // Mid layer — brighter cyan
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 3, color: 0x00FFFF, alpha: 0.7 });

    // White core
    this.graphics.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i]!.x, points[i]!.y);
    }
    this.graphics.stroke({ width: 1.5, color: 0xFFFFFF, alpha: 1.0 });
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
