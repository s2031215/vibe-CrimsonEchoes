// =============================================================================
// Dragon - Blue dragon that flies from chain lightning target toward player
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export class Dragon {
  public container: Container;
  private graphics: Graphics;
  private trailGraphics: Graphics;
  public position: Vec2 = { x: 0, y: 0 };
  public velocity: Vec2 = { x: 0, y: 0 };
  public damage: number = 1;
  public radius: number = 20; // Slightly larger hitbox for longer dragon
  private trailPositions: Vec2[] = [];
  private animationTimer: number = 0;
  private readonly maxTrailPositions = 12; // Longer trail for arrow effect

  constructor() {
    this.container = new Container();
    
    // Trail effect (behind main dragon)
    this.trailGraphics = new Graphics();
    this.container.addChild(this.trailGraphics);
    
    // Main dragon graphics
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    
    this.container.visible = false;
  }

  /** Activate dragon at position, flying toward target */
  activate(pos: Vec2, target: Vec2, damage: number, speed: number): void {
    this.position = { x: pos.x, y: pos.y };
    this.damage = damage;
    
    // Calculate velocity toward target
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
    this.drawDragon();
  }

  /** Draw the blue dragon */
  private drawDragon(): void {
    this.graphics.clear();
    
    // Arrow-like dragon design (elongated VERTICAL, 8x64 pixels)
    const wingFlap = Math.sin(this.animationTimer * 10) * 2; // Wing animation
    
    // Dragon body (elongated arrow shaft - VERTICAL orientation)
    this.graphics.beginPath();
    this.graphics.ellipse(0, 0, 4, 32);
    this.graphics.fill({ color: 0x3366FF, alpha: 1.0 }); // Blue body
    
    // Wings (flapping, positioned mid-body on Y-axis)
    const wingY = 6; // Centered on vertical body
    
    // Left wing
    this.graphics.beginPath();
    this.graphics.moveTo(0, -wingY);
    this.graphics.lineTo(-6 + wingFlap, -wingY - 8);
    this.graphics.lineTo(2, -wingY - 4);
    this.graphics.fill({ color: 0x6699FF, alpha: 0.8 }); // Lighter blue wings
    
    // Right wing
    this.graphics.beginPath();
    this.graphics.moveTo(0, wingY);
    this.graphics.lineTo(-6 + wingFlap, wingY + 8);
    this.graphics.lineTo(2, wingY + 4);
    this.graphics.fill({ color: 0x6699FF, alpha: 0.8 });
    
    // Dragon head - pointed arrow tip (TOP of vertical body)
    this.graphics.beginPath();
    this.graphics.moveTo(0, -32);  // Sharp tip at top
    this.graphics.lineTo(-5, -24);  // Wider base
    this.graphics.lineTo(5, -24);
    this.graphics.fill({ color: 0x0044CC, alpha: 1.0 }); // Darker blue head
    
    // Eyes (glowing, on head)
    this.graphics.circle(-2, -26, 1.5);
    this.graphics.fill({ color: 0xFFFF00, alpha: 1.0 }); // Yellow eyes
    this.graphics.circle(2, -26, 1.5);
    this.graphics.fill({ color: 0xFFFF00, alpha: 1.0 });
    
    // Tail - arrow fletching (BOTTOM of vertical body)
    this.graphics.beginPath();
    this.graphics.moveTo(0, 32);  // Tail base
    this.graphics.lineTo(-4, 36);  // Left fletching
    this.graphics.lineTo(0, 34);
    this.graphics.lineTo(4, 36);   // Right fletching
    this.graphics.lineTo(0, 32);
    this.graphics.fill({ color: 0x3366FF, alpha: 1.0 });
    
    // Rotate to face movement direction
    this.graphics.rotation = Math.atan2(this.velocity.y, this.velocity.x);
  }

  /** Draw trail effect behind dragon */
  private drawTrail(): void {
    this.trailGraphics.clear();
    
    if (this.trailPositions.length < 2) return;
    
    // Draw trail with fading blue particles
    for (let i = 0; i < this.trailPositions.length; i++) {
      const pos = this.trailPositions[i];
      if (!pos) continue;
      
      const alpha = (i + 1) / this.trailPositions.length; // Fade from old to new
      const size = 3 + (alpha * 4); // Grow from 3 to 7 pixels
      
      // Blue glow with fading alpha
      this.trailGraphics.circle(
        pos.x - this.position.x, // Relative to dragon position
        pos.y - this.position.y,
        size
      );
      this.trailGraphics.fill({ color: 0x3366FF, alpha: alpha * 0.5 });
      
      // Bright cyan core
      this.trailGraphics.circle(
        pos.x - this.position.x,
        pos.y - this.position.y,
        size * 0.5
      );
      this.trailGraphics.fill({ color: 0x66CCFF, alpha: alpha * 0.7 });
    }
  }

  /** Update dragon movement and animation */
  update(dt: number, screenWidth: number, screenHeight: number): boolean {
    if (!this.container.visible) return true;
    
    // Update position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.container.position.set(this.position.x, this.position.y);
    
    // Update animation timer
    this.animationTimer += dt;
    
    // Update trail
    this.trailPositions.push({ x: this.position.x, y: this.position.y });
    if (this.trailPositions.length > this.maxTrailPositions) {
      this.trailPositions.shift();
    }
    
    // Redraw dragon for animation
    this.drawDragon();
    this.drawTrail();
    
    // Check if dragon has left the screen (with buffer)
    if (
      this.position.x < -50 ||
      this.position.x > screenWidth + 50 ||
      this.position.y < -50 ||
      this.position.y > screenHeight + 50
    ) {
      this.container.visible = false;
      return true; // Remove
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
  }
}
