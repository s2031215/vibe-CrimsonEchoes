// =============================================================================
// Echo System - Auto-firing projectiles
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Projectile } from "@entities/Projectile";
import { LaserBeam } from "@entities/LaserBeam";
import { Meteorite } from "@entities/Meteorite";
import { Dragon } from "@entities/Dragon";
import { CrimsonWave } from "@entities/CrimsonWave";
import { PlayerClone } from "@entities/PlayerClone";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { HealEnemy } from "@entities/HealEnemy";
import { ObjectPool } from "@utils/pool";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2, WeaponStats, SpiralBurstQueueItem } from "@/types";

export class EchoSystem {
  private projectilePool: ObjectPool<Projectile>;
  private laserBeamPool: ObjectPool<LaserBeam>;
  private meteoritePool: ObjectPool<Meteorite>;
  private dragonPool: ObjectPool<Dragon>;
  private crimsonWavePool: ObjectPool<CrimsonWave>;
  private activeCrimsonWaves: CrimsonWave[] = [];
  private clonePool: ObjectPool<PlayerClone>;
  private activeClone: PlayerClone | null = null; // Only one clone
  private container: Container;
  private fireTimer: number = 0;
  private waveConnectorGraphics: Graphics;

  // Last known player position (stored each update, used by chain arc and split wave)
  private lastPlayerPos: Vec2 = { x: 0, y: 0 };

  // Chain return arcs: lightning bolt drawn from last chain enemy back to player
  private chainReturnArcs: { x1: number; y1: number; x2: number; y2: number; lifetime: number }[] = [];

  // Override fire cooldown when meteorite mode is active (0 = use normal rate)
  public meteoriteFireCooldown: number = 0;

  // Override fire cooldown for Crimson Wave T3 shotgun (0 = use normal rate)
  public crimsonWaveFireCooldown: number = 0;

  // Upgradable Stats
  public stats = {
    damage: GAME_CONFIG.CRIMSON_SHOT.DAMAGE,
    fireRate: GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE,
    speed: GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED,
  };

  // Weapon Upgrades
  public weaponStats: WeaponStats = {
    shotgunCount: 1,
    shotgunWaveMode: false,
    shotgunLineWaveMode: false,
    shotgunWaveHoming: false,
    shotgunWavePierce: 0,
    pierceCount: 0,
    piercingSizeBoost: 1.0,
    piercingSpeedPenalty: 1.0,
    piercingLaserMode: false,
    splitOnHit: false,
    splitCount: 2,
    explosiveRadius: 0,
    meteoriteMode: false,
    meteoriteDuration: 3.0,
    meteoriteCount: 2,
    meteoriteSpawnRadius: 150,
    meteoriteMaxRadius: 0,
    chainCount: 0,
    chainDragonMode: false,
    fireRateMultiplier: 1.0,
    homingStrength: 0,
    homingSpeedBoost: 1.0,
    homingCloneMode: false,
    directionalMode: false,
    directionalCount: 4,
    directionalNovaMode: false,
    directionalNovaSpawnRadius: 40,
    directionalNovaOrbitDuration: 1.5,
    directionalNovaOrbitSpeed: Math.PI * 2,
    directionalSpawnDelay: 0.2, // 200ms between sequential spiral spawns
  };

  // Spiral burst queue for sequential spawning
  private spiralBurstQueue: SpiralBurstQueueItem[] = [];


  private get fireCooldown(): number {
    if (this.weaponStats.shotgunLineWaveMode && this.crimsonWaveFireCooldown > 0) {
      return this.crimsonWaveFireCooldown;
    }
    if (this.weaponStats.meteoriteMode && this.meteoriteFireCooldown > 0) {
      return this.meteoriteFireCooldown;
    }
    return 1 / (this.stats.fireRate * this.weaponStats.fireRateMultiplier);
  }

  constructor(parentContainer: Container) {
    this.container = new Container();
    parentContainer.addChild(this.container);

    // Initialize wave connector graphics
    this.waveConnectorGraphics = new Graphics();
    this.container.addChild(this.waveConnectorGraphics);

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

    // Initialize meteorite pool (for Explosive T3)
    this.meteoritePool = new ObjectPool<Meteorite>(
      () => {
        const meteorite = new Meteorite();
        this.container.addChild(meteorite.container);
        return meteorite;
      },
      (meteorite) => meteorite.reset(),
      5, // Initial pool size
      10 // Max 10 meteorites
    );

    // Initialize dragon pool (for Chain Lightning T3)
    this.dragonPool = new ObjectPool<Dragon>(
      () => {
        const dragon = new Dragon();
        this.container.addChild(dragon.container);
        return dragon;
      },
      (dragon) => dragon.reset(),
      3, // Initial pool size
      8 // Max 8 dragons
    );

    // Initialize crimson wave pool (for Shotgun T3)
    this.crimsonWavePool = new ObjectPool<CrimsonWave>(
      () => {
        const wave = new CrimsonWave();
        this.container.addChild(wave.container);
        return wave;
      },
      (wave) => wave.reset(),
      3,  // Initial pool size
      10  // Max 10 simultaneous waves
    );

    // Initialize clone pool (for Homing Missiles T3) - only 1 clone
    this.clonePool = new ObjectPool<PlayerClone>(
      () => {
        const clone = new PlayerClone();
        this.container.addChild(clone.container);
        return clone;
      },
      (clone) => clone.reset(),
      1, // Initial pool size
      1 // Max 1 clone
    );
  }

  /** Update echo system - fire projectiles/lasers and update existing ones */
  update(dt: number, playerPos: Vec2, enemies: ReadonlySet<Enemy>, boss: Boss | null = null, healEnemies: ReadonlySet<HealEnemy> = new Set()): void {
    // Store player position for use by chain arc and split wave
    this.lastPlayerPos = playerPos;
    // Process spiral burst queue (sequential spawning for Directional T3)
    if (this.spiralBurstQueue.length > 0) {
      for (let i = this.spiralBurstQueue.length - 1; i >= 0; i--) {
        const item = this.spiralBurstQueue[i];
        if (!item) continue;
        
        item.delay -= dt;
        
        if (item.delay <= 0) {
          // Time to spawn this projectile
          this.spawnSingleSpiralProjectile(
            item.index,
            item.angleStep,
            item.from,
            item.speed
          );
          // Remove from queue
          this.spiralBurstQueue.splice(i, 1);
        }
      }
    }

    // Update fire timer
    this.fireTimer -= dt;

    // Fire at nearest enemy
    if (this.fireTimer <= 0) {
      const nearestEnemy = this.findNearestEnemy(playerPos, enemies, boss, healEnemies, 200);

      if (nearestEnemy) {
        this.fireAtTarget(playerPos, this.getEntityPosition(nearestEnemy));
        
        // Spawn meteorites around player if meteorite mode is active
        if (this.weaponStats.meteoriteMode) {
          this.spawnRandomMeteorites(playerPos);
        }
      }

      this.fireTimer = this.fireCooldown;
    }

    // Update all active projectiles
    for (const proj of this.projectilePool.getActive()) {
      // Find nearest enemy for homing
      let nearestEnemy = undefined;
      if (proj.state.homingStrength > 0) {
        const nearest = this.findNearestEnemy(proj.state.position, enemies);
        nearestEnemy = nearest ? this.getEntityPosition(nearest) : undefined;
      }

      // Pass player position for orbiting projectiles
      if (!proj.update(dt, nearestEnemy, playerPos)) {
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

    // Update all active meteorites
    for (const meteorite of this.meteoritePool.getActive()) {
      const expired = meteorite.update(dt);
      if (expired && !meteorite.container.visible) {
        this.meteoritePool.release(meteorite);
      }
    }

    // Update all active dragons
    const screenWidth = GAME_CONFIG.WIDTH * GAME_CONFIG.SCALE;
    const screenHeight = GAME_CONFIG.HEIGHT * GAME_CONFIG.SCALE;
    for (const dragon of this.dragonPool.getActive()) {
      const expired = dragon.update(dt, screenWidth, screenHeight);
      if (expired && !dragon.container.visible) {
        this.dragonPool.release(dragon);
      }
    }

    // Update all active crimson waves (T3 Shotgun)
    for (let i = this.activeCrimsonWaves.length - 1; i >= 0; i--) {
      const wave = this.activeCrimsonWaves[i]!;
      if (wave.update(dt)) {
        this.crimsonWavePool.release(wave);
        this.activeCrimsonWaves.splice(i, 1);
      }
    }

    // Spawn or update player clone (Homing Missiles T3) - only despawn when off-camera
    if (this.weaponStats.homingCloneMode) {
      // Spawn clone if not active
      if (!this.activeClone || !this.activeClone.container.visible) {
        this.activeClone = this.clonePool.acquire();
        const cloneDamage = this.stats.damage * 0.5; // Clone does 50% damage
        this.activeClone.activate(playerPos, cloneDamage);
      }

      // Update clone
      if (this.activeClone && this.activeClone.container.visible) {
        this.activeClone.update(dt, playerPos, enemies, (clonePos: Vec2) => {
          // Clone fires projectile
          const nearestEnemy = this.findNearestEnemy(clonePos, enemies, boss);
          if (nearestEnemy) {
            this.fireAtTargetFromClone(clonePos, this.getEntityPosition(nearestEnemy));
          }
        });
        
        // Check if clone moved outside camera bounds and despawn it
        const screenWidth = GAME_CONFIG.WIDTH * GAME_CONFIG.SCALE;
        const screenHeight = GAME_CONFIG.HEIGHT * GAME_CONFIG.SCALE;
        const cameraLeft = playerPos.x - screenWidth / 2;
        const cameraRight = playerPos.x + screenWidth / 2;
        const cameraTop = playerPos.y - screenHeight / 2;
        const cameraBottom = playerPos.y + screenHeight / 2;
        
        // Release clone if it's outside camera bounds
        if (
          this.activeClone.position.x < cameraLeft - 100 ||
          this.activeClone.position.x > cameraRight + 100 ||
          this.activeClone.position.y < cameraTop - 100 ||
          this.activeClone.position.y > cameraBottom + 100
        ) {
          this.clonePool.release(this.activeClone);
          this.activeClone = null;
        }
      }
    } else {
      // Deactivate clone if mode is disabled
      if (this.activeClone && this.activeClone.container.visible) {
        this.clonePool.release(this.activeClone);
        this.activeClone = null;
      }
    }

    // Draw chain return arcs
    this.drawChainReturnArcs(dt);
  }

  /** Draw/age chain return arcs (jagged cyan bolt from last chain enemy back to player) */
  private drawChainReturnArcs(dt: number): void {
    this.waveConnectorGraphics.clear();

    const CHAIN_ARC_LIFETIME = 0.3;
    for (let i = this.chainReturnArcs.length - 1; i >= 0; i--) {
      const arc = this.chainReturnArcs[i];
      if (!arc) continue;
      arc.lifetime -= dt;
      if (arc.lifetime <= 0) {
        this.chainReturnArcs.splice(i, 1);
        continue;
      }

      const alpha = arc.lifetime / CHAIN_ARC_LIFETIME;
      const dx = arc.x2 - arc.x1;
      const dy = arc.y2 - arc.y1;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      // Perpendicular unit vector for jagged offsets
      const px = -dy / len;
      const py = dx / len;

      // Build 5 random-offset intermediate points along the bolt
      const SEGMENTS = 6; // 5 mid-points -> 6 segments
      const points: { x: number; y: number }[] = [{ x: arc.x1, y: arc.y1 }];
      for (let s = 1; s < SEGMENTS; s++) {
        const t = s / SEGMENTS;
        const jitter = (Math.random() - 0.5) * len * 0.25;
        points.push({
          x: arc.x1 + dx * t + px * jitter,
          y: arc.y1 + dy * t + py * jitter,
        });
      }
      points.push({ x: arc.x2, y: arc.y2 });

      // Outer glow (cyan)
      this.waveConnectorGraphics.moveTo(points[0]!.x, points[0]!.y);
      for (let s = 1; s < points.length; s++) {
        this.waveConnectorGraphics.lineTo(points[s]!.x, points[s]!.y);
      }
      this.waveConnectorGraphics.stroke({ width: 6, color: 0x00FFFF, alpha: alpha * 0.35 });

      // Mid layer (cyan)
      this.waveConnectorGraphics.moveTo(points[0]!.x, points[0]!.y);
      for (let s = 1; s < points.length; s++) {
        this.waveConnectorGraphics.lineTo(points[s]!.x, points[s]!.y);
      }
      this.waveConnectorGraphics.stroke({ width: 3, color: 0x00FFFF, alpha: alpha * 0.7 });

      // White core
      this.waveConnectorGraphics.moveTo(points[0]!.x, points[0]!.y);
      for (let s = 1; s < points.length; s++) {
        this.waveConnectorGraphics.lineTo(points[s]!.x, points[s]!.y);
      }
      this.waveConnectorGraphics.stroke({ width: 1, color: 0xFFFFFF, alpha: alpha });
    }
  }

  /** Register a chain return arc from the last-hit enemy position back to the player */
  public addChainReturnArc(fromPos: Vec2): void {
    this.chainReturnArcs.push({
      x1: fromPos.x,
      y1: fromPos.y,
      x2: this.lastPlayerPos.x,
      y2: this.lastPlayerPos.y,
      lifetime: 0.3,
    });
  }

  /** Extract world position from any targetable entity */
  private getEntityPosition(entity: Enemy | Boss | HealEnemy): Vec2 {
    if (entity instanceof HealEnemy) {
      return entity.position;
    }
    return entity.state.position;
  }

  /** Find the nearest active enemy */
  private findNearestEnemy(
    playerPos: Vec2,
    enemies: ReadonlySet<Enemy>,
    boss: Boss | null = null,
    healEnemies: ReadonlySet<HealEnemy> = new Set(),
    maxRange: number = Infinity
  ): Enemy | Boss | HealEnemy | null {
    let nearest: Enemy | Boss | HealEnemy | null = null;
    let nearestDist = maxRange; // Only consider enemies within maxRange

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

    // Check heal enemies
    for (const he of healEnemies) {
      if (!he.active) continue;

      const dist = distance(playerPos, he.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = he;
      }
    }

    return nearest;
  }

  /** Fire a projectile at target position (clone version, simplified) */
  private fireAtTargetFromClone(from: Vec2, to: Vec2): void {
    const direction = normalize(subtract(to, from));
    let speed = this.stats.speed * this.weaponStats.homingSpeedBoost;
    this.spawnProjectile(from.x, from.y, direction.x * speed, direction.y * speed);
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

    // DIRECTIONAL MODE: 360° burst pattern
    if (this.weaponStats.directionalMode) {
      // T3: Nova Burst - Expanding ring with trails
      if (this.weaponStats.directionalNovaMode) {
        this.fireNovaBurst(from, speed);
        return;
      }
      
      // T1-T2: Regular directional burst
      const totalCount = this.weaponStats.directionalCount;
      const angleStep = (Math.PI * 2) / totalCount;

      for (let i = 0; i < totalCount; i++) {
        const angle = angleStep * i;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.spawnProjectile(from.x, from.y, vx, vy);
      }
      return;
    }

    // T3 CRIMSON WAVE: Expanding fan cone — checked before shotgunCount guard
    if (this.weaponStats.shotgunLineWaveMode) {
      this.spawnCrimsonWave(from, Math.atan2(direction.y, direction.x));
      return;
    }

    // SHOTGUN MODE: Spread pattern
    const shotgunCount = this.weaponStats.shotgunCount;
    if (shotgunCount > 1) {
      // T1-T2: Regular spread pattern
      const spreadRadians = this.weaponStats.shotgunWaveMode 
        ? (120 * Math.PI) / 180  // Old T3 mode (deprecated)
        : (GAME_CONFIG.UPGRADES.SHOTGUN_SPREAD * Math.PI) / 180; // T1-T2: 30° narrow spread
      const baseAngle = Math.atan2(direction.y, direction.x);

      for (let i = 0; i < shotgunCount; i++) {
        // Spread projectiles evenly
        const offset = (i - (shotgunCount - 1) / 2) * (spreadRadians / (shotgunCount - 1 || 1));
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
    
    // DIRECTIONAL MODE: 360° burst pattern
    if (this.weaponStats.directionalMode) {
      const totalCount = this.weaponStats.directionalCount;
      const angleStep = (Math.PI * 2) / totalCount;

      for (let i = 0; i < totalCount; i++) {
        const angle = angleStep * i;
        const endX = from.x + Math.cos(angle) * laserLength;
        const endY = from.y + Math.sin(angle) * laserLength;
        this.spawnLaserBeam(from.x, from.y, endX, endY);
      }
      return;
    }

    // SHOTGUN MODE: Spread laser beams
    const shotgunCount = this.weaponStats.shotgunCount;
    if (shotgunCount > 1) {
      const spreadRadians = this.weaponStats.shotgunWaveMode 
        ? (120 * Math.PI) / 180  // T3: 120° wave
        : (GAME_CONFIG.UPGRADES.SHOTGUN_SPREAD * Math.PI) / 180; // T1-T2: 30° narrow spread
      const baseAngle = Math.atan2(direction.y, direction.x);

      for (let i = 0; i < shotgunCount; i++) {
        // Spread laser beams evenly
        const offset = (i - (shotgunCount - 1) / 2) * (spreadRadians / (shotgunCount - 1 || 1));
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

  /** Spawn an expanding crimson wave fan (T3 Shotgun) */
  private spawnCrimsonWave(
    pos: Vec2,
    angle: number,
    maxRadius: number = 200,
    maxLifetime: number = 0.8,
    halfAngle: number = Math.PI / 3
  ): void {
    const wave = this.crimsonWavePool.acquire();
    wave.activate(pos, angle, this.stats.damage, maxRadius, maxLifetime, halfAngle);
    this.activeCrimsonWaves.push(wave);
  }

  /** Fire nova burst - Queue projectiles for sequential spawning (0.2s delay each) */
  private fireNovaBurst(from: Vec2, speed: number): void {
    const totalCount = this.weaponStats.directionalCount; // 12
    const angleStep = (Math.PI * 2) / totalCount;
    const spawnDelay = this.weaponStats.directionalSpawnDelay; // 0.2s
    
    // Clear any existing queue
    this.spiralBurstQueue = [];
    
    // Queue all projectiles with staggered delays
    for (let i = 0; i < totalCount; i++) {
      this.spiralBurstQueue.push({
        delay: i * spawnDelay,  // 0s, 0.2s, 0.4s, 0.6s, ... 2.2s
        index: i,
        from: { x: from.x, y: from.y }, // Copy position
        speed,
        angleStep,
        totalCount,
      });
    }
  }

  /** Spawn a single spiral projectile from queue */
  private spawnSingleSpiralProjectile(
    index: number,
    angleStep: number,
    from: Vec2,
    speed: number
  ): void {
    const startAngle = angleStep * index;
    
    // Spiral flight parameters
    const startRadius = 10;
    const angularVelocity = Math.PI * 1.5;
    const growthRate = 15;
    const direction = 1;
    
    // Spawn at starting position
    const spawnX = from.x + Math.cos(startAngle) * startRadius;
    const spawnY = from.y + Math.sin(startAngle) * startRadius;
    
    const vx = Math.cos(startAngle) * speed;
    const vy = Math.sin(startAngle) * speed;
    
    const proj = this.projectilePool.acquire();
    proj.activate(spawnX, spawnY, vx, vy, this.stats.damage);
    
    // Apply standard upgrades
    proj.setUpgradeProperties(
      this.weaponStats.pierceCount,
      this.weaponStats.splitOnHit,
      this.weaponStats.explosiveRadius > 0,
      this.weaponStats.chainCount > 0,
      this.weaponStats.chainCount,
      this.weaponStats.homingStrength,
      this.weaponStats.piercingSizeBoost
    );
    
    // Enable trail effect
    proj.state.hasTrail = true;
    
    // Enable Archimedean spiral flight (no phase offset needed - sequential spawning handles it)
    proj.enableSpiralFlight(
      from,
      startAngle,      // Just use starting angle
      startRadius,
      angularVelocity,
      growthRate,
      direction
    );
    
    // Persist until leaving camera
    proj.state.ignoreLifetime = true;
  }

  /** Spawn split projectiles from a hit */
  spawnSplitProjectiles(fromPos: Vec2, direction?: Vec2): void {
    if (!this.weaponStats.splitOnHit) return;

    const speed = this.stats.speed * 0.7; // Slower than main projectiles

    // T3 Shotgun + any Split Shot: small mini-cone in the kill direction
    if (this.weaponStats.shotgunLineWaveMode && direction) {
      const angle = Math.atan2(direction.y, direction.x);
      this.spawnCrimsonWave(fromPos, angle, 80, 0.4, Math.PI / 5); // smaller, tighter cone
      return;
    }

    // T1/T2: fire in random directions
    const totalSplits = this.weaponStats.splitCount * this.weaponStats.shotgunCount;
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

  /** Get all active meteorites for collision detection */
  getActiveMeteorites(): ReadonlySet<Meteorite> {
    return this.meteoritePool.getActive();
  }

  /** Get all active dragons for collision detection */
  getActiveDragons(): ReadonlySet<Dragon> {
    return this.dragonPool.getActive();
  }

  /** Get all active crimson waves for collision detection */
  getActiveCrimsonWaves(): readonly CrimsonWave[] {
    return this.activeCrimsonWaves;
  }

  /** Spawn a dragon at position flying toward target */
  spawnDragon(pos: Vec2, target: Vec2, damage: number): void {
    const dragon = this.dragonPool.acquire();
    const speed = this.stats.speed * 1.5; // Dragons fly 1.5x faster than projectiles
    dragon.activate(pos, target, damage, speed);
  }

  /** Spawn a meteorite at position */
  spawnMeteorite(pos: Vec2, radius: number, damage: number, duration: number): void {
    const meteorite = this.meteoritePool.acquire();
    meteorite.activate(pos, radius, damage, duration);
  }

  /** Spawn random meteorites around player position */
  private spawnRandomMeteorites(playerPos: Vec2): void {
    const count = this.weaponStats.meteoriteCount;
    const spawnRadius = this.weaponStats.meteoriteSpawnRadius;
    // In meteorite mode use the animated max radius; otherwise fall back to explosiveRadius
    const maxRadius = this.weaponStats.meteoriteMaxRadius > 0
      ? this.weaponStats.meteoriteMaxRadius
      : this.weaponStats.explosiveRadius;
    const damage = this.stats.damage * GAME_CONFIG.UPGRADES.EXPLOSION_DAMAGE_MULT;
    const duration = this.weaponStats.meteoriteDuration;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = spawnRadius * (0.5 + Math.random() * 0.5);

      const x = playerPos.x + Math.cos(angle) * distance;
      const y = playerPos.y + Math.sin(angle) * distance;

      this.spawnMeteorite({ x, y }, maxRadius, damage, duration);
    }
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
    this.meteoritePool.releaseAll();
    this.dragonPool.releaseAll();
    this.crimsonWavePool.releaseAll();
    this.activeCrimsonWaves = [];
    this.clonePool.releaseAll();
    this.activeClone = null;
    this.fireTimer = 0;
    this.chainReturnArcs = [];
    this.meteoriteFireCooldown = 0;
    this.crimsonWaveFireCooldown = 0;
    this.waveConnectorGraphics.clear();
    
    // Reset stats to default values
    this.stats.damage = GAME_CONFIG.CRIMSON_SHOT.DAMAGE;
    this.stats.fireRate = GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE;
    this.stats.speed = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;
    
    // Reset weapon upgrades
    this.weaponStats.shotgunCount = 1;
    this.weaponStats.shotgunWaveMode = false;
    this.weaponStats.shotgunLineWaveMode = false;
    this.weaponStats.shotgunWaveHoming = false;
    this.weaponStats.shotgunWavePierce = 0;
    this.weaponStats.pierceCount = 0;
    this.weaponStats.piercingSizeBoost = 1.0;
    this.weaponStats.piercingSpeedPenalty = 1.0;
    this.weaponStats.piercingLaserMode = false;
    this.weaponStats.splitOnHit = false;
    this.weaponStats.splitCount = 2;
    this.weaponStats.explosiveRadius = 0;
    this.weaponStats.meteoriteMode = false;
    this.weaponStats.meteoriteDuration = 3.0;
    this.weaponStats.meteoriteCount = 2;
    this.weaponStats.meteoriteSpawnRadius = 150;
    this.weaponStats.meteoriteMaxRadius = 0;
    this.weaponStats.chainCount = 0;
    this.weaponStats.chainDragonMode = false;
    this.weaponStats.fireRateMultiplier = 1.0;
    this.weaponStats.homingStrength = 0;
    this.weaponStats.homingSpeedBoost = 1.0;
    this.weaponStats.homingCloneMode = false;
    this.weaponStats.directionalMode = false;
    this.weaponStats.directionalCount = 4;
  }
}
