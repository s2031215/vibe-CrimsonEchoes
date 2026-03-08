// =============================================================================
// Player Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { PlayerState, Vec2 } from "@/types";

export interface PlayerStats {
  maxHealth: number;
  speed: number;
  dashCooldown: number;
  dashSpeed: number;
  dashDuration: number;
}

export class Player {
  public state: PlayerState;
  public stats: PlayerStats;
  public container: Container;
  private visual!: Graphics;
  private blinkTimer: number = 0;
  private animationTimer: number = 0;

  constructor() {
    this.stats = {
      maxHealth: GAME_CONFIG.PLAYER.MAX_HEALTH,
      speed: GAME_CONFIG.PLAYER.SPEED,
      dashCooldown: GAME_CONFIG.PLAYER.DASH_COOLDOWN,
      dashSpeed: GAME_CONFIG.PLAYER.DASH_SPEED,
      dashDuration: GAME_CONFIG.PLAYER.DASH_DURATION,
    };

    this.state = {
      position: {
        x: GAME_CONFIG.MAP_WIDTH / 2,
        y: GAME_CONFIG.MAP_HEIGHT / 2,
      },
      velocity: { x: 0, y: 0 },
      active: true,
      health: this.stats.maxHealth,
      maxHealth: this.stats.maxHealth,
      invincibilityTimer: 0,
      dashCooldownTimer: 0,
      isDashing: false,
      dashTimer: 0,
    };

    this.container = new Container();
    this.visual = new Graphics();
    this.container.addChild(this.visual);

    // Draw the procedural player sprite
    this.drawPlayer();

    this.updatePosition();
  }

  private drawPlayer(): void {
    this.visual.clear();
    
    // SIMPLE SHAPE: ROUND PLAYER WITH DETAILS
    
    // Beige outline
    this.visual.fill(0x948979); // Beige outline
    this.visual.circle(0, 0, 9);
    
    // Main body - Beige circle
    this.visual.fill(0x948979); // Beige
    this.visual.circle(0, 0, 5);
    
    // Mouth (simple line)
    this.visual.fill(0xDFD0B8); // Light beige
    this.visual.rect(-2, 2, 4, 1);
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  private updateAnimation(dt: number, moveDir: Vec2): void {
    // Determine direction based on movement
    if (this.visual.scale) {
      if (moveDir.x < -0.5) {
        this.visual.scale.x = -1; // face left
      } else if (moveDir.x > 0.5) {
        this.visual.scale.x = 1; // face right
      }
    }

    const isMoving = moveDir.x !== 0 || moveDir.y !== 0;

    // Procedural bobbing animation for walk cycle
    if (isMoving) {
      this.animationTimer += dt * 15; // speed of bobbing
      this.visual.y = Math.sin(this.animationTimer) * 2; // bob up and down by 2 pixels
      this.visual.rotation = Math.sin(this.animationTimer / 2) * 0.1; // slight wiggle
    } else {
      // Return to idle state
      this.visual.y = 0;
      this.visual.rotation = 0;
      this.animationTimer = 0;
    }
  }

  /** Update player state */
  update(dt: number, moveDir: Vec2, dashPressed: boolean): void {
    // Update timers
    if (this.state.invincibilityTimer > 0) {
      this.state.invincibilityTimer -= dt;
      this.blinkTimer += dt;
      // Blink effect during invincibility
      this.container.visible = Math.floor(this.blinkTimer * 10) % 2 === 0;
    } else {
      this.container.visible = true;
      this.blinkTimer = 0;
    }

    if (this.state.dashCooldownTimer > 0) {
      this.state.dashCooldownTimer -= dt;
    }

    // Handle dashing
    if (this.state.isDashing) {
      this.state.dashTimer -= dt;
      if (this.state.dashTimer <= 0) {
        this.state.isDashing = false;
      }
    }

    // Start dash
    if (
      dashPressed &&
      !this.state.isDashing &&
      this.state.dashCooldownTimer <= 0 &&
      (moveDir.x !== 0 || moveDir.y !== 0)
    ) {
      this.state.isDashing = true;
      this.state.dashTimer = this.stats.dashDuration;
      this.state.dashCooldownTimer = this.stats.dashCooldown;

      // Set dash velocity
      const dashSpeed = this.stats.dashSpeed;
      this.state.velocity.x = moveDir.x * dashSpeed;
      this.state.velocity.y = moveDir.y * dashSpeed;
    }

    // Normal movement (when not dashing)
    if (!this.state.isDashing) {
      const speed = this.stats.speed;
      this.state.velocity.x = moveDir.x * speed;
      this.state.velocity.y = moveDir.y * speed;
    }

    // Apply velocity
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    // Clamp player to 800x800 boundary (100px margin from map edges)
    const halfSize = GAME_CONFIG.PLAYER.SIZE / 2;
    const boundaryMargin = 100;
    const minX = boundaryMargin + halfSize;
    const maxX = GAME_CONFIG.MAP_WIDTH - boundaryMargin - halfSize;
    const minY = boundaryMargin + halfSize;
    const maxY = GAME_CONFIG.MAP_HEIGHT - boundaryMargin - halfSize;
    
    this.state.position.x = Math.max(minX, Math.min(maxX, this.state.position.x));
    this.state.position.y = Math.max(minY, Math.min(maxY, this.state.position.y));

    // Update animation
    this.updateAnimation(dt, moveDir);

    this.updatePosition();
  }

  /** Take damage */
  takeDamage(amount: number): boolean {
    if (this.state.invincibilityTimer > 0) return false;

    this.state.health -= amount;
    this.state.invincibilityTimer = GAME_CONFIG.PLAYER.INVINCIBILITY_TIME;

    if (this.state.health <= 0) {
      this.state.health = 0;
      this.state.active = false;
      return true; // Player died
    }

    return false;
  }

  /** Check if player is invincible */
  isInvincible(): boolean {
    return this.state.invincibilityTimer > 0;
  }

  /** Reset player state */
  reset(): void {
    this.stats = {
      maxHealth: GAME_CONFIG.PLAYER.MAX_HEALTH,
      speed: GAME_CONFIG.PLAYER.SPEED,
      dashCooldown: GAME_CONFIG.PLAYER.DASH_COOLDOWN,
      dashSpeed: GAME_CONFIG.PLAYER.DASH_SPEED,
      dashDuration: GAME_CONFIG.PLAYER.DASH_DURATION,
    };
    this.state.position.x = GAME_CONFIG.MAP_WIDTH / 2;
    this.state.position.y = GAME_CONFIG.MAP_HEIGHT / 2;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    this.state.health = this.stats.maxHealth;
    this.state.maxHealth = this.stats.maxHealth;
    this.state.invincibilityTimer = 0;
    this.state.dashCooldownTimer = 0;
    this.state.isDashing = false;
    this.state.dashTimer = 0;
    this.state.active = true;
    this.updatePosition();
  }
}
