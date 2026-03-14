// =============================================================================
// HealEnemy - Special enemy that keeps its distance; drops a heal heart on death
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2 } from "@/types";

export class HealEnemy {
  public container: Container;
  public active: boolean = false;

  public health: number = GAME_CONFIG.HEAL_ENEMY.HEALTH;
  public maxHealth: number = GAME_CONFIG.HEAL_ENEMY.HEALTH;
  public readonly isHealEnemy: boolean = true;

  /** World position */
  public position: Vec2 = { x: 0, y: 0 };

  private graphics: Graphics;

  // Pulse animation
  private pulseTimer: number = 0;

  // Wander AI
  private wanderDir: Vec2 = { x: 1, y: 0 };
  private wanderTimer: number = 0;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.graphics = new Graphics();
    this.drawEnemy();
    this.container.addChild(this.graphics);
  }

  private drawEnemy(): void {
    this.graphics.clear();

    const half = 8; // 16×16 square — same footprint as normal enemy

    // Dark-red border
    this.graphics.rect(-half, -half, half * 2, half * 2);
    this.graphics.fill(0x551434);
    
    // Dark-pink body fill
    this.graphics.rect(-half + 1, -half + 1, half * 2 - 2, half * 2 - 2);
    this.graphics.fill(0x95235c);

    // Dark-red cross — horizontal bar
    this.graphics.rect(-5, -1.5, 10, 3);
    this.graphics.fill(0xd63384);
    // Dark-red cross — vertical bar
    this.graphics.rect(-1.5, -5, 3, 10);
    this.graphics.fill(0xd63384);
  }

  /** Activate at world position */
  activate(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.health = GAME_CONFIG.HEAL_ENEMY.HEALTH;
    this.maxHealth = GAME_CONFIG.HEAL_ENEMY.HEALTH;
    this.pulseTimer = Math.random() * Math.PI * 2;
    // Pick a random initial wander direction
    const angle = Math.random() * Math.PI * 2;
    this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
    this.wanderTimer = 0; // Fire a direction pick immediately on first safe frame
    this.active = true;
    this.container.visible = true;
    this.container.x = x;
    this.container.y = y;
    this.container.scale.set(1);
  }

  /** Deactivate */
  deactivate(): void {
    this.active = false;
    this.container.visible = false;
    this.container.scale.set(1);
  }

  /** Take damage — returns true if killed */
  takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.deactivate();
      return true;
    }
    return false;
  }

  /** Update — keep 200px from player; wander randomly when at safe distance */
  update(dt: number, playerPos: Vec2): void {
    if (!this.active) return;

    // Subtle scale pulse so it reads as a special entity
    this.pulseTimer += dt * 4;
    const scale = 1 + Math.sin(this.pulseTimer) * 0.08;
    this.container.scale.set(scale);

    const speed = GAME_CONFIG.HEAL_ENEMY.SPEED;
    const desiredDist = GAME_CONFIG.HEAL_ENEMY.DESIRED_DIST;
    const dist = distance(this.position, playerPos);

    let moveDir: Vec2;

    if (dist < desiredDist) {
      // Too close — flee directly away from player
      const toPlayer = subtract(playerPos, this.position);
      moveDir = normalize({ x: -toPlayer.x, y: -toPlayer.y });
      // Reset wander timer so a fresh direction is chosen once we're safe
      this.wanderTimer = 0;
    } else {
      // Safe zone — wander in a random direction, always moving
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        // Pick a new random direction; bias slightly away from edges
        const angle = Math.random() * Math.PI * 2;
        this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
        this.wanderTimer = 1.5 + Math.random() * 1.0; // 1.5–2.5 s
      }
      moveDir = this.wanderDir;
    }

    // Apply movement at flat speed — no teleport or boost
    this.position.x += moveDir.x * speed * dt;
    this.position.y += moveDir.y * speed * dt;

    // Clamp to playable area
    const margin = GAME_CONFIG.BOUNDARY.MARGIN + 10;
    this.position.x = Math.max(margin, Math.min(GAME_CONFIG.MAP_WIDTH - margin, this.position.x));
    this.position.y = Math.max(margin, Math.min(GAME_CONFIG.MAP_HEIGHT - margin, this.position.y));

    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.deactivate();
    this.health = GAME_CONFIG.HEAL_ENEMY.HEALTH;
    this.maxHealth = GAME_CONFIG.HEAL_ENEMY.HEALTH;
    this.pulseTimer = 0;
    this.wanderDir = { x: 1, y: 0 };
    this.wanderTimer = 0;
  }
}
