// =============================================================================
// Boss Enemy Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { EnemyState, Vec2 } from "@/types";
import { normalize, subtract, randomRange } from "@utils/math";

// Attack callbacks
export type SpawnProjectileCallback = (x: number, y: number, vx: number, vy: number, damage: number) => void;
export type SpawnLaserWarningCallback = (from: Vec2, to: Vec2, duration: number) => void;
export type SpawnLaserBeamCallback = (from: Vec2, to: Vec2, damage: number) => void;

export class Boss {
  public state: EnemyState;
  public container: Container;
  private graphics: Graphics;
  private flashTimer: number = 0;
  public bossType: number = 1; // 1 = 3min boss, 2 = 5min boss
  
  // Attack system
  private attackTimer: number = 0;
  private laserWarningTimer: number = -1; // -1 = not active
  private laserTargetPos: Vec2 | null = null;
  
  // Attack callbacks (set by SpawnSystem)
  public onSpawnProjectile: SpawnProjectileCallback | null = null;
  public onSpawnLaserWarning: SpawnLaserWarningCallback | null = null;
  public onSpawnLaserBeam: SpawnLaserBeamCallback | null = null;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      health: GAME_CONFIG.BOSS.HEALTH,
      maxHealth: GAME_CONFIG.BOSS.HEALTH,
      damage: GAME_CONFIG.BOSS.DAMAGE,
      speed: GAME_CONFIG.BOSS.SPEED,
      xpValue: GAME_CONFIG.BOSS.XP_VALUE,
    };

    this.container = new Container();
    this.graphics = this.createBossGraphics(1);
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  private createBossGraphics(bossType: number = 1): Graphics {
    const g = new Graphics();
    const size = GAME_CONFIG.BOSS.SIZE / 2; // Radius
    
    // Different colors based on boss type
    let bodyColor: number;
    let eyeColor: number;
    
    if (bossType === 2) {
      // 5min boss - Blue/Cyan (laser boss)
      bodyColor = 0x00008B; // Dark Blue
      eyeColor = 0x00FFFF; // Cyan
    } else {
      // 3min boss - Red (default)
      bodyColor = 0x8B0000; // Dark Red
      eyeColor = 0xFF0000; // Red
    }
    
    // LARGE BOSS - MENACING PENTAGON SHAPE
    
    // White outline (larger)
    g.fill(0xFFFFFF); // White outline
    const sides = 5;
    const outerRadius = size + 2;
    g.moveTo(0, -outerRadius);
    for (let i = 1; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      g.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
    }
    g.closePath();
    
    // Main body - Pentagon with boss-specific color
    g.fill(bodyColor);
    g.moveTo(0, -size);
    for (let i = 1; i <= sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      g.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
    }
    g.closePath();
    
    // Large angry eyes (triangular)
    g.fill(eyeColor);
    g.moveTo(-10, -8);
    g.lineTo(-6, -4);
    g.lineTo(-14, -4);
    g.closePath();
    
    g.moveTo(10, -8);
    g.lineTo(14, -4);
    g.lineTo(6, -4);
    g.closePath();
    
    // Eye glows
    g.fill(0xFFFF00); // Yellow glow
    g.circle(-10, -6, 2);
    g.circle(10, -6, 2);
    
    // Jagged mouth
    g.fill(0x000000); // Black
    g.moveTo(-8, 4);
    g.lineTo(-4, 8);
    g.lineTo(0, 4);
    g.lineTo(4, 8);
    g.lineTo(8, 4);
    g.lineTo(0, 6);
    g.closePath();

    // Crown/spikes on top
    g.fill(0xFFD700); // Gold
    for (let i = 0; i < 3; i++) {
      const angle = ((i - 1) * Math.PI) / 6 - Math.PI / 2;
      const baseX = Math.cos(angle) * size;
      const baseY = Math.sin(angle) * size;
      g.moveTo(baseX, baseY);
      g.lineTo(baseX + Math.cos(angle) * 8, baseY + Math.sin(angle) * 8);
      g.lineTo(baseX + 3, baseY);
      g.closePath();
    }

    return g;
  }

  /** Activate boss at position */
  activate(x: number, y: number, bossType: number = 1): void {
    this.bossType = bossType;
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    
    // Set boss health based on type
    const baseHealth = GAME_CONFIG.BOSS.HEALTH;
    this.state.health = bossType === 2 ? baseHealth * 1.5 : baseHealth; // 5min boss has more HP
    this.state.maxHealth = this.state.health;
    
    this.state.active = true;
    this.container.visible = true;
    this.flashTimer = 0;
    
    // Initialize attack timers
    this.attackTimer = randomRange(1, 2); // First attack after 1-2 seconds
    this.laserWarningTimer = -1;
    this.laserTargetPos = null;
    
    // Recreate graphics with boss type-specific colors
    this.container.removeChild(this.graphics);
    this.graphics = this.createBossGraphics(bossType);
    this.container.addChild(this.graphics);
    
    this.updatePosition();
  }

  /** Deactivate boss */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
  }

  /** Update boss - move toward target */
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

    // Apply velocity
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;

    // Rotation animation for intimidation
    this.graphics.rotation += dt * 0.5;

    // Update attack timers
    this.updateAttacks(dt, targetPos);

    this.updatePosition();
  }

  /** Update attack system based on boss type */
  private updateAttacks(dt: number, targetPos: Vec2): void {
    // Type 1 boss (3min) - Slow projectile attack
    if (this.bossType === 1) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.fireSlowProjectile(targetPos);
        this.attackTimer = randomRange(2, 3); // Fire every 2-3 seconds
      }
    }
    
    // Type 2 boss (5min) - Laser and multi-shot attacks
    if (this.bossType === 2) {
      // Check if laser warning is active
      if (this.laserWarningTimer > 0) {
        this.laserWarningTimer -= dt;
        
        // Fire laser when warning expires
        if (this.laserWarningTimer <= 0 && this.laserTargetPos) {
          this.fireLaser(this.laserTargetPos);
          this.laserWarningTimer = -1;
          this.laserTargetPos = null;
        }
      } else {
        // Normal attack timer
        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
          // Alternate between laser and multi-shot
          const useLaser = Math.random() < 0.6; // 60% laser, 40% multi-shot
          
          if (useLaser) {
            this.showLaserWarning(targetPos);
          } else {
            this.fireMultiShot(targetPos);
          }
          
          this.attackTimer = randomRange(3, 5); // Attack every 3-5 seconds
        }
      }
    }
  }

  /** Type 1 Boss: Fire a slow projectile toward target */
  private fireSlowProjectile(targetPos: Vec2): void {
    if (!this.onSpawnProjectile) return;
    
    // Calculate direction to target
    const dir = subtract(targetPos, this.state.position);
    const direction = normalize(dir);
    
    // Slow projectile speed (80 pixels/sec)
    const speed = 80;
    const vx = direction.x * speed;
    const vy = direction.y * speed;
    
    this.onSpawnProjectile(this.state.position.x, this.state.position.y, vx, vy, 1);
  }

  /** Type 2 Boss: Show laser warning marker */
  private showLaserWarning(targetPos: Vec2): void {
    if (!this.onSpawnLaserWarning) return;
    
    // Calculate direction toward player
    const dir = subtract(targetPos, this.state.position);
    const direction = normalize(dir);
    
    // Extend the laser line very far in that direction (2000 pixels)
    const laserLength = 2000;
    const endX = this.state.position.x + direction.x * laserLength;
    const endY = this.state.position.y + direction.y * laserLength;
    
    // Store direction for when laser fires (not the player's position)
    this.laserTargetPos = { x: endX, y: endY };
    
    // Show 1-second warning
    this.laserWarningTimer = 1.0;
    this.onSpawnLaserWarning(
      { x: this.state.position.x, y: this.state.position.y },
      this.laserTargetPos,
      1.0
    );
  }

  /** Type 2 Boss: Fire laser beam */
  private fireLaser(targetPos: Vec2): void {
    if (!this.onSpawnLaserBeam) return;
    
    // Fire laser in the stored direction (not at current player position)
    this.onSpawnLaserBeam(
      { x: this.state.position.x, y: this.state.position.y },
      targetPos,
      2 // Laser damage
    );
  }

  /** Type 2 Boss: Fire random multi-shot pattern */
  private fireMultiShot(targetPos: Vec2): void {
    if (!this.onSpawnProjectile) return;
    
    // Fire 5 projectiles in a spread pattern
    const numProjectiles = 5;
    const spreadAngle = Math.PI / 3; // 60 degree spread
    
    // Calculate base direction to target
    const dir = subtract(targetPos, this.state.position);
    const baseAngle = Math.atan2(dir.y, dir.x);
    
    for (let i = 0; i < numProjectiles; i++) {
      // Spread projectiles evenly within the cone
      const offsetAngle = spreadAngle * ((i / (numProjectiles - 1)) - 0.5);
      const angle = baseAngle + offsetAngle;
      
      // Fast projectiles (120 pixels/sec)
      const speed = 120;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.onSpawnProjectile(this.state.position.x, this.state.position.y, vx, vy, 1);
    }
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
    this.state.health = GAME_CONFIG.BOSS.HEALTH;
    this.state.maxHealth = GAME_CONFIG.BOSS.HEALTH;
    this.container.visible = false;
    this.flashTimer = 0;
    this.graphics.tint = 0xffffff;
    this.graphics.rotation = 0;
    
    // Reset attack timers
    this.attackTimer = 0;
    this.laserWarningTimer = -1;
    this.laserTargetPos = null;
    
    // Clear callbacks
    this.onSpawnProjectile = null;
    this.onSpawnLaserWarning = null;
    this.onSpawnLaserBeam = null;
  }

  /** Get health percentage (0-1) */
  getHealthPercent(): number {
    return this.state.health / this.state.maxHealth;
  }
}
