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
  public radius: number = 16; // Enemy-sized hitbox
  private trailPositions: Vec2[] = [];
  private animationTimer: number = 0;

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
    
    // Simple dragon design (16x16 sprite style)
    const wingFlap = Math.sin(this.animationTimer * 10) * 2; // Wing animation
    
    // Dragon body (elongated oval)
    this.graphics.beginPath();
    this.graphics.ellipse(0, 0, 12, 8);
    this.graphics.fill({ color: 0x3366FF, alpha: 1.0 }); // Blue body
    
    // Wings (flapping)
    // Left wing
    this.graphics.beginPath();
    this.graphics.moveTo(-6, 0);
    this.graphics.lineTo(-12, -4 + wingFlap);
    this.graphics.lineTo(-8, 2);
    this.graphics.fill({ color: 0x6699FF, alpha: 0.8 }); // Lighter blue wings
    
    // Right wing
    this.graphics.beginPath();
    this.graphics.moveTo(6, 0);
    this.graphics.lineTo(12, -4 + wingFlap);
    this.graphics.lineTo(8, 2);
    this.graphics.fill({ color: 0x6699FF, alpha: 0.8 });
    
    // Dragon head (pointed)
    this.graphics.beginPath();
    this.graphics.moveTo(0, -10);
    this.graphics.lineTo(-3, -6);
    this.graphics.lineTo(3, -6);
    this.graphics.fill({ color: 0x0044CC, alpha: 1.0 }); // Darker blue head
    
    // Eyes (glowing)
    this.graphics.circle(-2, -7, 1);
    this.graphics.fill({ color: 0xFFFF00, alpha: 1.0 }); // Yellow eyes
    this.graphics.circle(2, -7, 1);
    this.graphics.fill({ color: 0xFFFF00, alpha: 1.0 });
    
    // Tail (curved)
    this.graphics.beginPath();
    this.graphics.moveTo(0, 6);
    this.graphics.lineTo(-2, 10);
    this.graphics.lineTo(2, 10);
    this.graphics.fill({ color: 0x3366FF, alpha: 1.0 });
    
    // Rotate to face movement direction
    this.graphics.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;
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
    if (this.trailPositions.length > 8) {
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
