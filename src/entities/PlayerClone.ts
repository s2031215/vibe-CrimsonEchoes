// =============================================================================
// PlayerClone - Homing Missiles T3 clone that attacks enemies
// =============================================================================

import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "@/types";
import type { Enemy } from "@entities/Enemy";

export class PlayerClone {
  public container: Container;
  private visual: Graphics;
  public position: Vec2 = { x: 0, y: 0 };
  private targetPosition: Vec2 = { x: 0, y: 0 };
  private velocity: Vec2 = { x: 0, y: 0 };
  private fireTimer: number = 0;
  private fireCooldown: number = 0.5; // Fire every 0.5 seconds (slower than player)
  private animationTimer: number = 0;
  private cloneSpeed: number = 360; // 3x player speed (player is 120)
  private maintainDistance: number = 120; // Stay this far from enemies
  public damage: number = 1; // Set when spawned

  constructor() {
    this.container = new Container();
    this.visual = new Graphics();
    this.container.addChild(this.visual);
    this.container.visible = false;
    this.drawClone();
  }

  /** Draw the clone visual (lighter/paler version of player) */
  private drawClone(): void {
    this.visual.clear();
    
    // LIGHTER VERSION OF PLAYER
    
    // Pale beige outline (lighter)
    this.visual.fill(0xD4C9B9); // Lighter beige outline
    this.visual.circle(0, 0, 9);
    
    // Main body - Pale beige circle
    this.visual.fill(0xD4C9B9); // Pale beige
    this.visual.circle(0, 0, 5);
    
    // Mouth (simple line) - slightly lighter
    this.visual.fill(0xEFE0C8); // Very light beige
    this.visual.rect(-2, 2, 4, 1);
    
    // Add a subtle glow to indicate it's a clone
    this.visual.circle(0, 0, 11);
    this.visual.fill({ color: 0xFFFFFF, alpha: 0.2 }); // White glow
  }

  /** Activate clone at position */
  activate(pos: Vec2, damage: number): void {
    this.position = { x: pos.x, y: pos.y };
    this.targetPosition = { x: pos.x, y: pos.y };
    this.velocity = { x: 0, y: 0 };
    this.damage = damage;
    this.fireTimer = 0;
    this.animationTimer = 0;
    this.container.visible = true;
    this.updatePosition();
  }

  /** Deactivate clone */
  deactivate(): void {
    this.container.visible = false;
  }

  /** Update clone AI and movement */
  update(
    dt: number,
    playerPos: Vec2,
    enemies: ReadonlySet<Enemy>,
    onFire: (clonePos: Vec2) => void
  ): void {
    if (!this.container.visible) return;

    // Update animation timer
    this.animationTimer += dt * 15;
    this.visual.y = Math.sin(this.animationTimer) * 2; // Bob up and down
    this.visual.rotation = Math.sin(this.animationTimer / 2) * 0.1; // Slight wiggle

    // AI: Find nearest enemy and position nearby
    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.state.active) continue;

      const dist = Math.sqrt(
        (this.position.x - enemy.state.position.x) ** 2 +
        (this.position.y - enemy.state.position.y) ** 2
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      // Position clone at maintainDistance from enemy
      const dx = this.position.x - nearestEnemy.state.position.x;
      const dy = this.position.y - nearestEnemy.state.position.y;
      const currentDist = Math.sqrt(dx * dx + dy * dy);

      if (currentDist > 0) {
        // Calculate target position (maintainDistance away from enemy)
        const dirX = dx / currentDist;
        const dirY = dy / currentDist;
        this.targetPosition.x = nearestEnemy.state.position.x + dirX * this.maintainDistance;
        this.targetPosition.y = nearestEnemy.state.position.y + dirY * this.maintainDistance;
      }
    } else {
      // No enemies, stay near player
      this.targetPosition.x = playerPos.x;
      this.targetPosition.y = playerPos.y;
    }

    // Move toward target position
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) { // Only move if not at target
      this.velocity.x = (dx / dist) * this.cloneSpeed;
      this.velocity.y = (dy / dist) * this.cloneSpeed;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
    } else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    // Update facing direction
    if (this.velocity.x < -0.5) {
      this.visual.scale.x = -1; // Face left
    } else if (this.velocity.x > 0.5) {
      this.visual.scale.x = 1; // Face right
    }

    this.updatePosition();

    // Fire at enemies
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      // Find nearest enemy to attack
      let nearestEnemy: Enemy | null = null;
      let nearestDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        const dist = Math.sqrt(
          (this.position.x - enemy.state.position.x) ** 2 +
          (this.position.y - enemy.state.position.y) ** 2
        );

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy) { // Fire at any enemy on screen (no range limit)
        onFire(this.position);
        this.fireTimer = this.fireCooldown;
      }
    }
  }

  private updatePosition(): void {
    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.fireTimer = 0;
    this.animationTimer = 0;
    this.container.visible = false;
  }
}
