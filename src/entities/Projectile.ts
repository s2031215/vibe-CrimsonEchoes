// =============================================================================
// Projectile Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { ProjectileState } from "@/types";

export class Projectile {
  public state: ProjectileState;
  public container: Container;
  private graphics: Graphics;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      damage: GAME_CONFIG.CRIMSON_SHOT.DAMAGE,
      lifetime: GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME,
      pierce: 0,
      pierceCount: 0,
      canSplit: false,
      isExplosive: false,
      canChain: false,
      chainCount: 0,
      homingStrength: 0,
      targetEnemy: undefined,
    };

    this.container = new Container();
    this.graphics = this.createProjectileGraphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  private createProjectileGraphics(): Graphics {
    const g = new Graphics();
    
    // SPACE LASER - SIMPLE LINE STYLE
    // Thin laser beam like classic space shooters
    
    // Outer glow (cyan)
    g.fill({ color: 0x00ffff, alpha: 0.4 }); // Cyan glow
    g.rect(-1, -4, 2, 8);
    
    // Main laser body (bright cyan)
    g.fill(0x00ffff); // Cyan laser
    g.rect(-0.5, -3, 1, 6);
    
    // White hot core
    g.fill(0xffffff);
    g.rect(-0.5, -2, 1, 4);

    return g;
  }

  /** Activate projectile and orient it toward direction of travel */
  activate(x: number, y: number, vx: number, vy: number, damage: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = vx;
    this.state.velocity.y = vy;
    this.state.damage = damage;
    this.state.lifetime = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME;
    this.state.active = true;
    this.state.pierceCount = 0;
    this.state.targetEnemy = undefined;
    this.container.visible = true;

    // Rotate laser to point in direction of travel
    this.graphics.rotation = Math.atan2(vy, vx) + Math.PI / 2; // +90deg for vertical laser

    this.updatePosition();
  }

  /** Deactivate projectile */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
  }

  /** Update projectile state */
  update(dt: number, nearestEnemy: { x: number; y: number } | undefined = undefined): boolean {
    if (!this.state.active) return false;

    // Update lifetime
    this.state.lifetime -= dt;
    if (this.state.lifetime <= 0) {
      this.deactivate();
      return false;
    }

    // Homing behavior
    if (this.state.homingStrength > 0 && nearestEnemy) {
      const dx = nearestEnemy.x - this.state.position.x;
      const dy = nearestEnemy.y - this.state.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // Calculate desired direction
        const targetVelX = (dx / dist) * GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;
        const targetVelY = (dy / dist) * GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;

        // Lerp toward target direction based on homing strength
        const turnRate = this.state.homingStrength * dt * 5; // Adjust turn speed
        this.state.velocity.x += (targetVelX - this.state.velocity.x) * turnRate;
        this.state.velocity.y += (targetVelY - this.state.velocity.y) * turnRate;

        // Update rotation to match velocity
        this.graphics.rotation = Math.atan2(this.state.velocity.y, this.state.velocity.x) + Math.PI / 2;
      }
    }

    // Update position
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    this.updatePosition();
    return true;
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.state.active = false;
    this.state.lifetime = 0;
    this.state.pierceCount = 0;
    this.state.targetEnemy = undefined;
    this.container.visible = false;
    this.graphics.scale.set(1, 1); // Reset scale
  }

  /** Mark that this projectile hit an enemy (for pierce tracking) */
  markHit(): boolean {
    this.state.pierceCount++;
    // Return true if projectile should be deactivated
    return this.state.pierceCount > this.state.pierce;
  }

  /** Set weapon upgrade properties */
  setUpgradeProperties(
    pierce: number,
    canSplit: boolean,
    isExplosive: boolean,
    canChain: boolean,
    chainCount: number,
    homingStrength: number,
    sizeMultiplier: number = 1.0
  ): void {
    this.state.pierce = pierce;
    this.state.canSplit = canSplit;
    this.state.isExplosive = isExplosive;
    this.state.canChain = canChain;
    this.state.chainCount = chainCount;
    this.state.homingStrength = homingStrength;
    
    // Apply size multiplier
    this.graphics.scale.set(sizeMultiplier, sizeMultiplier);
  }
}
