// =============================================================================
// Echo System - Auto-firing projectiles
// =============================================================================

import { Container } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Projectile } from "@entities/Projectile";
import { LaserBeam } from "@entities/LaserBeam";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { ObjectPool } from "@utils/pool";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2, WeaponStats } from "@/types";

export class EchoSystem {
  private projectilePool: ObjectPool<Projectile>;
  private laserBeamPool: ObjectPool<LaserBeam>;
  private container: Container;
  private fireTimer: number = 0;

  // Upgradable Stats
  public stats = {
    damage: GAME_CONFIG.CRIMSON_SHOT.DAMAGE,
    fireRate: GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE,
    speed: GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED,
  };

  // Weapon Upgrades
  public weaponStats: WeaponStats = {
    multiShot: 1,
    pierceCount: 0,
    piercingSizeBoost: 1.0,
    piercingSpeedPenalty: 1.0,
    piercingLaserMode: false,
    splitOnHit: false,
    splitCount: 2,
    explosiveRadius: 0,
    chainCount: 0,
    fireRateMultiplier: 1.0,
    homingStrength: 0,
    homingSpeedBoost: 1.0,
    shotgunMode: false,
    shotgunCount: 4,
  };

  private get fireCooldown(): number {
    return 1 / (this.stats.fireRate * this.weaponStats.fireRateMultiplier);
  }

  constructor(parentContainer: Container) {
    this.container = new Container();
    parentContainer.addChild(this.container);

    // Initialize projectile pool
    this.projectilePool = new ObjectPool<Projectile>(
      () => {
        const proj = new Projectile();
        this.container.addChild(proj.container);
        return proj;
      },
      (proj) => proj.reset(),
      20, // Initial pool size
      GAME_CONFIG.MAX_PROJECTILES
    );

    // Initialize laser beam pool (for Piercing T3)
    this.laserBeamPool = new ObjectPool<LaserBeam>(
      () => {
        const beam = new LaserBeam();
        this.container.addChild(beam.container);
        return beam;
      },
      (beam) => beam.reset(),
      5, // Initial pool size
      20 // Max 20 laser beams
    );
  }

  /** Update echo system - fire projectiles/lasers and update existing ones */
  update(dt: number, playerPos: Vec2, enemies: ReadonlySet<Enemy>, boss: Boss | null = null): void {
    // Update fire timer
    this.fireTimer -= dt;

    // Fire at nearest enemy
    if (this.fireTimer <= 0) {
      const nearestEnemy = this.findNearestEnemy(playerPos, enemies, boss);

      if (nearestEnemy) {
        this.fireAtTarget(playerPos, nearestEnemy.state.position);
      }

      this.fireTimer = this.fireCooldown;
    }

    // Update all active projectiles
    for (const proj of this.projectilePool.getActive()) {
      // Find nearest enemy for homing
      let nearestEnemy = undefined;
      if (proj.state.homingStrength > 0) {
        const nearest = this.findNearestEnemy(proj.state.position, enemies);
        nearestEnemy = nearest ? nearest.state.position : undefined;
      }

      if (!proj.update(dt, nearestEnemy)) {
        this.projectilePool.release(proj);
      }
    }

    // Update all active laser beams
    for (const beam of this.laserBeamPool.getActive()) {
      const expired = beam.update(dt);
      if (expired && !beam.container.visible) {
        this.laserBeamPool.release(beam);
      }
    }
  }

  /** Find the nearest active enemy */
  private findNearestEnemy(
    playerPos: Vec2,
    enemies: ReadonlySet<Enemy>,
    boss: Boss | null = null
  ): Enemy | Boss | null {
    let nearest: Enemy | Boss | null = null;
    let nearestDist = Infinity;

    // Check regular enemies
    for (const enemy of enemies) {
      if (!enemy.state.active) continue;

      const dist = distance(playerPos, enemy.state.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    // Check boss
    if (boss && boss.state.active) {
      const dist = distance(playerPos, boss.state.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = boss;
      }
    }

    return nearest;
  }

  /** Fire a projectile at target position */
  private fireAtTarget(from: Vec2, to: Vec2): void {
    // LASER MODE: Piercing T3 fires instant laser beams
    if (this.weaponStats.piercingLaserMode) {
      this.fireLaserBeam(from, to);
      return;
    }

    const direction = normalize(subtract(to, from));
    
    // Apply speed modifiers from upgrades
    let speed = this.stats.speed;
    speed *= this.weaponStats.piercingSpeedPenalty; // Piercing makes slower
    speed *= this.weaponStats.homingSpeedBoost; // Homing makes faster

    // Calculate total projectile count (multiplicative)
    let totalCount = this.weaponStats.multiShot;
    let isShotgunPattern = false;

    // If shotgun mode is active, multiply the counts
    if (this.weaponStats.shotgunMode) {
      totalCount = this.weaponStats.multiShot * this.weaponStats.shotgunCount;
      isShotgunPattern = true;
    }

    // Shotgun pattern - fire in 360° pattern
    if (isShotgunPattern) {
      const angleStep = (Math.PI * 2) / totalCount;

      for (let i = 0; i < totalCount; i++) {
        const angle = angleStep * i;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.spawnProjectile(from.x, from.y, vx, vy);
      }
      return;
    }

    // Multi-shot mode - fire multiple projectiles in spread
    if (totalCount > 1) {
      const spreadRadians = (GAME_CONFIG.UPGRADES.MULTI_SHOT_SPREAD * Math.PI) / 180;
      const baseAngle = Math.atan2(direction.y, direction.x);

      for (let i = 0; i < totalCount; i++) {
        // Spread projectiles evenly
        const offset = (i - (totalCount - 1) / 2) * (spreadRadians / (totalCount - 1 || 1));
        const angle = baseAngle + offset;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.spawnProjectile(from.x, from.y, vx, vy);
      }
    } else {
      // Single shot
      this.spawnProjectile(from.x, from.y, direction.x * speed, direction.y * speed);
    }
  }

  /** Spawn laser beams (for Piercing T3) */
  private fireLaserBeam(from: Vec2, to: Vec2): void {
    const direction = normalize(subtract(to, from));
    const laserLength = 2000; // Very long laser like boss
    
    // Calculate total laser count (multiplicative)
    let totalCount = this.weaponStats.multiShot;
    let isShotgunPattern = false;

    // If shotgun mode is active, multiply the counts
    if (this.weaponStats.shotgunMode) {
      totalCount = this.weaponStats.multiShot * this.weaponStats.shotgunCount;
      isShotgunPattern = true;
    }

    // Shotgun pattern - fire laser beams in 360° pattern
    if (isShotgunPattern) {
      const angleStep = (Math.PI * 2) / totalCount;

      for (let i = 0; i < totalCount; i++) {
        const angle = angleStep * i;
        const endX = from.x + Math.cos(angle) * laserLength;
        const endY = from.y + Math.sin(angle) * laserLength;
        this.spawnLaserBeam(from.x, from.y, endX, endY);
      }
      return;
    }

    // Multi-shot mode - fire multiple laser beams in spread
    if (totalCount > 1) {
      const spreadRadians = (GAME_CONFIG.UPGRADES.MULTI_SHOT_SPREAD * Math.PI) / 180;
      const baseAngle = Math.atan2(direction.y, direction.x);

      for (let i = 0; i < totalCount; i++) {
        // Spread laser beams evenly
        const offset = (i - (totalCount - 1) / 2) * (spreadRadians / (totalCount - 1 || 1));
        const angle = baseAngle + offset;
        const endX = from.x + Math.cos(angle) * laserLength;
        const endY = from.y + Math.sin(angle) * laserLength;
        this.spawnLaserBeam(from.x, from.y, endX, endY);
      }
    } else {
      // Single laser beam
      const endX = from.x + direction.x * laserLength;
      const endY = from.y + direction.y * laserLength;
      this.spawnLaserBeam(from.x, from.y, endX, endY);
    }
  }

  /** Spawn a single laser beam */
  private spawnLaserBeam(x: number, y: number, endX: number, endY: number): void {
    const beam = this.laserBeamPool.acquire();
    beam.activate(
      { x, y },
      { x: endX, y: endY },
      this.stats.damage // Damage is already boosted by stat upgrades
    );
  }

  /** Spawn a single projectile with upgrade properties */
  private spawnProjectile(x: number, y: number, vx: number, vy: number): void {
    const proj = this.projectilePool.acquire();

    proj.activate(x, y, vx, vy, this.stats.damage);

    // Apply weapon upgrades
    proj.setUpgradeProperties(
      this.weaponStats.pierceCount,
      this.weaponStats.splitOnHit,
      this.weaponStats.explosiveRadius > 0,
      this.weaponStats.chainCount > 0,
      this.weaponStats.chainCount,
      this.weaponStats.homingStrength,
      this.weaponStats.piercingSizeBoost // Pass size multiplier
    );
  }

  /** Spawn split projectiles from a hit */
  spawnSplitProjectiles(fromPos: Vec2): void {
    if (!this.weaponStats.splitOnHit) return;

    // Split count multiplies with multi-shot
    const totalSplits = this.weaponStats.splitCount * this.weaponStats.multiShot;
    const speed = this.stats.speed * 0.7; // Slower than main projectiles

    // Fire in random directions
    for (let i = 0; i < totalSplits; i++) {
      const angle = Math.random() * Math.PI * 2; // Random angle 0-360°
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawnProjectile(fromPos.x, fromPos.y, vx, vy);
    }
  }

  /** Spawn chain projectile to next enemy */
  spawnChainProjectile(fromPos: Vec2, excludeEnemy: Enemy, enemies: ReadonlySet<Enemy>): void {
    const nearestEnemy = this.findNearestEnemyExcluding(fromPos, enemies, excludeEnemy);
    if (!nearestEnemy) return;

    const direction = normalize(subtract(nearestEnemy.state.position, fromPos));
    const speed = this.stats.speed;

    const proj = this.projectilePool.acquire();
    proj.activate(fromPos.x, fromPos.y, direction.x * speed, direction.y * speed, this.stats.damage * 0.8);

    // Chain projectiles have reduced chain count
    proj.setUpgradeProperties(
      this.weaponStats.pierceCount,
      false, // No split on chain
      this.weaponStats.explosiveRadius > 0,
      this.weaponStats.chainCount > 0,
      this.weaponStats.chainCount - 1, // Reduce chain count
      this.weaponStats.homingStrength
    );
  }

  /** Find nearest enemy excluding one */
  private findNearestEnemyExcluding(pos: Vec2, enemies: ReadonlySet<Enemy>, exclude: Enemy): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDist: number = GAME_CONFIG.UPGRADES.CHAIN_RANGE;

    for (const enemy of enemies) {
      if (!enemy.state.active || enemy === exclude) continue;

      const dist = distance(pos, enemy.state.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }

  /** Get all active projectiles for collision detection */
  getActiveProjectiles(): ReadonlySet<Projectile> {
    return this.projectilePool.getActive();
  }

  /** Get all active laser beams for collision detection */
  getActiveLaserBeams(): ReadonlySet<LaserBeam> {
    return this.laserBeamPool.getActive();
  }

  /** Release a projectile back to pool */
  releaseProjectile(proj: Projectile): void {
    this.projectilePool.release(proj);
  }

  /** Get projectile count */
  get projectileCount(): number {
    return this.projectilePool.activeCount;
  }

  /** Reset system */
  reset(): void {
    this.projectilePool.releaseAll();
    this.laserBeamPool.releaseAll();
    this.fireTimer = 0;
    
    // Reset stats to default values
    this.stats.damage = GAME_CONFIG.CRIMSON_SHOT.DAMAGE;
    this.stats.fireRate = GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE;
    this.stats.speed = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;
    
    // Reset weapon upgrades
    this.weaponStats.multiShot = 1;
    this.weaponStats.pierceCount = 0;
    this.weaponStats.piercingSizeBoost = 1.0;
    this.weaponStats.piercingSpeedPenalty = 1.0;
    this.weaponStats.piercingLaserMode = false;
    this.weaponStats.splitOnHit = false;
    this.weaponStats.splitCount = 2;
    this.weaponStats.explosiveRadius = 0;
    this.weaponStats.chainCount = 0;
    this.weaponStats.fireRateMultiplier = 1.0;
    this.weaponStats.homingStrength = 0;
    this.weaponStats.homingSpeedBoost = 1.0;
    this.weaponStats.shotgunMode = false;
    this.weaponStats.shotgunCount = 4;
  }
}
