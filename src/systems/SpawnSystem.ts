// =============================================================================
// Spawn System - Enemy wave management
// =============================================================================

import { Container } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { BossProjectile } from "@entities/BossProjectile";
import { LaserWarning } from "@entities/LaserWarning";
import { LaserBeam } from "@entities/LaserBeam";
import { ObjectPool } from "@utils/pool";
import { randomRange, randomInt } from "@utils/math";

export class SpawnSystem {
  private enemyPool: ObjectPool<Enemy>;
  private bossPool: ObjectPool<Boss>;
  private bossProjectilePool: ObjectPool<BossProjectile>;
  private laserWarningPool: ObjectPool<LaserWarning>;
  private laserBeamPool: ObjectPool<LaserBeam>;
  private container: Container;
  private spawnTimer: number = 0;
  private boss3MinSpawned: boolean = false;
  private boss5MinSpawned: boolean = false;
  private activeBoss: Boss | null = null;

  constructor(parentContainer: Container) {
    this.container = new Container();
    parentContainer.addChild(this.container);

    // Initialize enemy pool
    this.enemyPool = new ObjectPool<Enemy>(
      () => {
        const enemy = new Enemy();
        this.container.addChild(enemy.container);
        return enemy;
      },
      (enemy) => enemy.reset(),
      20, // Initial pool size
      GAME_CONFIG.MAX_ENEMIES
    );

    // Initialize boss pool
    this.bossPool = new ObjectPool<Boss>(
      () => {
        const boss = new Boss();
        this.container.addChild(boss.container);
        return boss;
      },
      (boss) => boss.reset(),
      1, // Only need 1 boss at a time
      1
    );

    // Initialize boss projectile pool
    this.bossProjectilePool = new ObjectPool<BossProjectile>(
      () => {
        const proj = new BossProjectile();
        this.container.addChild(proj.container);
        return proj;
      },
      (proj) => proj.reset(),
      10, // Initial pool size
      30 // Max 30 boss projectiles on screen
    );

    // Initialize laser warning pool
    this.laserWarningPool = new ObjectPool<LaserWarning>(
      () => {
        const warning = new LaserWarning();
        this.container.addChild(warning.container);
        return warning;
      },
      (warning) => warning.reset(),
      2, // Initial pool size
      3 // Max 3 warnings at once
    );

    // Initialize laser beam pool
    this.laserBeamPool = new ObjectPool<LaserBeam>(
      () => {
        const beam = new LaserBeam();
        this.container.addChild(beam.container);
        return beam;
      },
      (beam) => beam.reset(),
      2, // Initial pool size
      3 // Max 3 beams at once
    );
  }

  /** Update spawn system - handles enemy and boss spawning based on elapsed time */
  update(dt: number, elapsedTime: number, playerPos: { x: number; y: number }): void {
    // Spawn boss at 3 minutes (180 seconds)
    if (elapsedTime >= 180 && !this.boss3MinSpawned && !this.activeBoss) {
      this.spawnBoss(playerPos, 1); // Boss type 1 (slow projectiles)
      this.boss3MinSpawned = true;
    }

    // Spawn boss at 5 minutes (300 seconds - end of game)
    if (elapsedTime >= 300 && !this.boss5MinSpawned && !this.activeBoss) {
      this.spawnBoss(playerPos, 2); // Boss type 2 (laser + multi-shot)
      this.boss5MinSpawned = true;
    }

    // Calculate current spawn rate based on elapsed time
    const spawnRate = this.getSpawnRate(elapsedTime);
    const spawnInterval = 1 / spawnRate;

    this.spawnTimer -= dt;

    if (this.spawnTimer <= 0) {
      this.spawnEnemy(playerPos, elapsedTime);
      this.spawnTimer = spawnInterval;
    }
  }

  /** Calculate spawn rate based on elapsed time */
  private getSpawnRate(elapsedSeconds: number): number {
    const baseRate = GAME_CONFIG.SPAWN.BASE_RATE;
    const scalePerMinute = GAME_CONFIG.SPAWN.RATE_SCALE_PER_MINUTE;
    let rate = baseRate * (1 + (elapsedSeconds / 60) * scalePerMinute);
    
    // After 3 minutes (180s), significantly boost spawn rate
    if (elapsedSeconds >= 180) {
      rate *= GAME_CONFIG.SPAWN.RATE_BOOST_AFTER_3MIN;
    }
    
    return rate;
  }

  /** Spawn an enemy at a random off-screen position */
  private spawnEnemy(playerPos: { x: number; y: number }, elapsedTime: number): void {
    if (this.enemyPool.activeCount >= GAME_CONFIG.MAX_ENEMIES) return;

    const pos = this.getRandomSpawnPosition(playerPos);
    const enemy = this.enemyPool.acquire();
    
    // Calculate tier based on elapsed time (1 tier per minute)
    const currentTier = Math.floor(elapsedTime / 60) + 1;
    
    // Mix enemy tiers: 60% current tier, 40% earlier tiers (if available)
    let tier = currentTier;
    if (currentTier > 1 && Math.random() < 0.4) {
      // Spawn a random earlier tier (adds variety)
      tier = Math.floor(Math.random() * currentTier) + 1;
    }
    
    enemy.activate(pos.x, pos.y, tier);

    // Scale enemy stats based on tier
    let healthScale = 1 + ((tier - 1) * 60 / 60) * GAME_CONFIG.SPAWN.HEALTH_SCALE_PER_MINUTE;
    const speedScale = 1 + ((tier - 1) * 60 / 60) * GAME_CONFIG.SPAWN.SPEED_SCALE_PER_MINUTE;

    // After 3 minutes (tier 4+), significantly boost HP
    if (tier >= 4) {
      healthScale *= GAME_CONFIG.SPAWN.HEALTH_BOOST_AFTER_3MIN;
    }

    enemy.state.health = Math.ceil(GAME_CONFIG.NIGHTLING.HEALTH * healthScale);
    enemy.state.maxHealth = Math.ceil(GAME_CONFIG.NIGHTLING.HEALTH * healthScale);
    enemy.state.speed = GAME_CONFIG.NIGHTLING.SPEED * speedScale;
  }

  /** Spawn a boss at a random off-screen position */
  private spawnBoss(playerPos: { x: number; y: number }, bossType: number = 1): void {
    if (this.activeBoss && this.activeBoss.state.active) return; // Only one boss at a time

    const pos = this.getRandomSpawnPosition(playerPos);
    const boss = this.bossPool.acquire();
    boss.activate(pos.x, pos.y, bossType);
    this.activeBoss = boss;
  }

  /** Get a random position just off-screen relative to player */
  private getRandomSpawnPosition(playerPos: { x: number; y: number }): { x: number; y: number } {
    const margin = GAME_CONFIG.SPAWN.SPAWN_MARGIN;
    const edge = randomInt(0, 3); // 0: top, 1: right, 2: bottom, 3: left

    // The player is at center of screen.
    const cameraLeft = playerPos.x - GAME_CONFIG.WIDTH / 2;
    const cameraTop = playerPos.y - GAME_CONFIG.HEIGHT / 2;
    const cameraRight = playerPos.x + GAME_CONFIG.WIDTH / 2;
    const cameraBottom = playerPos.y + GAME_CONFIG.HEIGHT / 2;

    let x: number;
    let y: number;

    switch (edge) {
      case 0: // Top
        x = randomRange(cameraLeft, cameraRight);
        y = cameraTop - margin;
        break;
      case 1: // Right
        x = cameraRight + margin;
        y = randomRange(cameraTop, cameraBottom);
        break;
      case 2: // Bottom
        x = randomRange(cameraLeft, cameraRight);
        y = cameraBottom + margin;
        break;
      case 3: // Left
      default:
        x = cameraLeft - margin;
        y = randomRange(cameraTop, cameraBottom);
        break;
    }

    return { x, y };
  }

  /** Get all active enemies */
  getActiveEnemies(): ReadonlySet<Enemy> {
    return this.enemyPool.getActive();
  }

  /** Release an enemy back to pool */
  releaseEnemy(enemy: Enemy): void {
    this.enemyPool.release(enemy);
  }

  /** Release boss back to pool */
  releaseBoss(boss: Boss): void {
    this.bossPool.release(boss);
    if (this.activeBoss === boss) {
      this.activeBoss = null;
    }
  }

  /** Get active boss */
  getActiveBoss(): Boss | null {
    return this.activeBoss;
  }

  /** Get all active boss projectiles */
  getActiveBossProjectiles(): ReadonlySet<BossProjectile> {
    return this.bossProjectilePool.getActive();
  }

  /** Get all active laser warnings */
  getActiveLaserWarnings(): ReadonlySet<LaserWarning> {
    return this.laserWarningPool.getActive();
  }

  /** Get all active laser beams */
  getActiveLaserBeams(): ReadonlySet<LaserBeam> {
    return this.laserBeamPool.getActive();
  }

  /** Update boss attacks (projectiles, warnings, beams) */
  updateBossAttacks(dt: number): void {
    // Update boss projectiles
    for (const proj of this.bossProjectilePool.getActive()) {
      proj.update(dt);
      // Release if expired
      if (!proj.state.active) {
        this.bossProjectilePool.release(proj);
      }
    }

    // Update laser warnings
    for (const warning of this.laserWarningPool.getActive()) {
      const expired = warning.update(dt);
      // Release if expired
      if (expired && !warning.container.visible) {
        this.laserWarningPool.release(warning);
      }
    }

    // Update laser beams
    for (const beam of this.laserBeamPool.getActive()) {
      const expired = beam.update(dt);
      // Release if expired
      if (expired && !beam.container.visible) {
        this.laserBeamPool.release(beam);
      }
    }
  }

  /** Spawn a boss projectile */
  spawnBossProjectile(x: number, y: number, vx: number, vy: number, damage: number): void {
    if (this.bossProjectilePool.activeCount >= 30) return;
    const proj = this.bossProjectilePool.acquire();
    proj.activate(x, y, vx, vy, damage);
  }

  /** Spawn a laser warning */
  spawnLaserWarning(from: { x: number; y: number }, to: { x: number; y: number }, duration: number = 1.0): void {
    if (this.laserWarningPool.activeCount >= 3) return;
    const warning = this.laserWarningPool.acquire();
    warning.activate(from, to, duration);
  }

  /** Spawn a laser beam */
  spawnLaserBeam(from: { x: number; y: number }, to: { x: number; y: number }, damage: number): void {
    if (this.laserBeamPool.activeCount >= 3) return;
    const beam = this.laserBeamPool.acquire();
    beam.activate(from, to, damage);
  }

  /** Get enemy count */
  get enemyCount(): number {
    return this.enemyPool.activeCount;
  }

  /** Reset system */
  reset(): void {
    this.enemyPool.releaseAll();
    this.bossPool.releaseAll();
    this.spawnTimer = 0;
    this.boss3MinSpawned = false;
    this.boss5MinSpawned = false;
    this.activeBoss = null;
  }
}
