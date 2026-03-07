// =============================================================================
// Boss Projectile Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";

export interface BossProjectileState {
  position: Vec2;
  velocity: Vec2;
  active: boolean;
  damage: number;
  lifetime: number;
  maxLifetime: number;
}

export class BossProjectile {
  public state: BossProjectileState;
  public container: Container;
  private graphics: Graphics;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      damage: 1,
      lifetime: 0,
      maxLifetime: 5.0, // 5 seconds
    };

    this.container = new Container();
    this.graphics = new Graphics();
    
    // Red/orange enemy projectile
    this.graphics.circle(0, 0, 4);
    this.graphics.fill(0xFF4500); // Orange-red
    
    // Outer glow
    this.graphics.circle(0, 0, 6);
    this.graphics.fill({ color: 0xFF0000, alpha: 0.3 }); // Red glow
    
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  /** Activate projectile */
  activate(x: number, y: number, vx: number, vy: number, damage: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = vx;
    this.state.velocity.y = vy;
    this.state.damage = damage;
    this.state.lifetime = 0;
    this.state.active = true;
    this.container.visible = true;
    this.updatePosition();
  }

  /** Deactivate projectile */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
  }

  /** Update projectile */
  update(dt: number): void {
    if (!this.state.active) return;

    // Update lifetime
    this.state.lifetime += dt;
    if (this.state.lifetime >= this.state.maxLifetime) {
      this.deactivate();
      return;
    }

    // Move
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    // Rotate based on velocity direction
    const angle = Math.atan2(this.state.velocity.y, this.state.velocity.x);
    this.graphics.rotation = angle;

    this.updatePosition();
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.state.active = false;
    this.state.lifetime = 0;
    this.container.visible = false;
    this.graphics.rotation = 0;
  }
}
