// =============================================================================
// Enemy Entity (Base class and Nightling)
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { EnemyState, Vec2 } from "@/types";
import { normalize, subtract } from "@utils/math";

export class Enemy {
  public state: EnemyState;
  public container: Container;
  private graphics: Graphics;
  private flashTimer: number = 0;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      health: GAME_CONFIG.NIGHTLING.HEALTH,
      maxHealth: GAME_CONFIG.NIGHTLING.HEALTH,
      damage: GAME_CONFIG.NIGHTLING.DAMAGE,
      speed: GAME_CONFIG.NIGHTLING.SPEED,
      xpValue: GAME_CONFIG.NIGHTLING.XP_VALUE,
    };

    this.container = new Container();
    this.graphics = this.createEnemyGraphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  private createEnemyGraphics(): Graphics {
    const g = new Graphics();
    
    // SIMPLE SHAPE: SQUARE WITH DETAILS (color varies by tier)
    
    // White outline
    g.fill(0xFFFFFF); // White outline
    g.rect(-9, -9, 18, 18);
    
    // Main body - Purple square (default tier 1)
    g.fill(0x211832); // Purple
    g.rect(-7, -7, 15, 15);
  
    // Mouth (angry line)
    g.fill(0x412B6B); // Dark purple
    g.rect(-3, 2, 6, 2);

    return g;
  }

  /** Activate enemy at position */
  activate(x: number, y: number, tier: number = 1): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    this.state.health = GAME_CONFIG.NIGHTLING.HEALTH;
    this.state.active = true;
    this.container.visible = true;
    this.flashTimer = 0;
    
    // Set color based on tier (minute)
    this.setColorByTier(tier);
    
    this.updatePosition();
  }

  /** Set enemy color based on tier/minute */
  private setColorByTier(tier: number): void {
    // Clear previous graphics
    this.graphics.clear();
    
    let bodyColor: number;
    let mouthColor: number;
    
    switch (tier) {
      case 1: // Minute 0-1: Purple (default)
        bodyColor = 0x211832;
        mouthColor = 0x412B6B;
        break;
      case 2: // Minute 1-2: Blue
        bodyColor = 0x1a2b52;
        mouthColor = 0x2a4b7b;
        break;
      case 3: // Minute 2-3: Green
        bodyColor = 0x1a4d2e;
        mouthColor = 0x2a6d4e;
        break;
      case 4: // Minute 3-4: Orange
        bodyColor = 0x6b3410;
        mouthColor = 0x8b5420;
        break;
      case 5: // Minute 4-5: Red
        bodyColor = 0x6b1010;
        mouthColor = 0x8b2020;
        break;
      default: // 5+ minutes: Dark Red
        bodyColor = 0x4b0808;
        mouthColor = 0x6b1010;
        break;
    }
    
    // White outline
    this.graphics.fill(0xFFFFFF);
    this.graphics.rect(-9, -9, 18, 18);
    
    // Main body
    this.graphics.fill(bodyColor);
    this.graphics.rect(-7, -7, 15, 15);
  
    // Mouth
    this.graphics.fill(mouthColor);
    this.graphics.rect(-3, 2, 6, 2);
  }

  /** Deactivate enemy */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
  }

  /** Update enemy - move toward target */
  update(dt: number, targetPos: Vec2): void {
    if (!this.state.active) return;

    // Flash effect when hit
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.graphics.tint = 0xff0000; // Red when hit
    } else {
      this.graphics.tint = 0xffffff; // Normal color
    }

    // Move toward target
    const dir = subtract(targetPos, this.state.position);
    const direction = normalize(dir);
    this.state.velocity.x = direction.x * this.state.speed;
    this.state.velocity.y = direction.y * this.state.speed;

    // NO pulsing animation - keep it simple like 1980s arcade games

    // Apply velocity
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    this.updatePosition();
  }

  /** Take damage, returns true if killed */
  takeDamage(amount: number): boolean {
    this.state.health -= amount;
    this.flashTimer = 0.1; // Flash red briefly
    this.graphics.tint = 0xff0000;

    if (this.state.health <= 0) {
      this.deactivate();
      return true;
    }

    return false;
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.state.active = false;
    this.state.health = GAME_CONFIG.NIGHTLING.HEALTH;
    this.container.visible = false;
    this.flashTimer = 0;
    this.graphics.tint = 0xffffff;
    if (this.graphics.scale) {
      this.graphics.scale.x = 1;
      this.graphics.scale.y = 1;
    }
  }
}
