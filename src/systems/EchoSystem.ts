// =============================================================================
// Echo System - Auto-firing projectiles
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Projectile } from "@entities/Projectile";
import { LaserBeam } from "@entities/LaserBeam";
import { Meteorite } from "@entities/Meteorite";
import { Dragon } from "@entities/Dragon";
import { PlayerClone } from "@entities/PlayerClone";
import { Enemy } from "@entities/Enemy";
import { Boss } from "@entities/Boss";
import { ObjectPool } from "@utils/pool";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2, WeaponStats } from "@/types";

export class EchoSystem {
  private projectilePool: ObjectPool<Projectile>;
  private laserBeamPool: ObjectPool<LaserBeam>;
  private meteoritePool: ObjectPool<Meteorite>;
  private dragonPool: ObjectPool<Dragon>;
  private clonePool: ObjectPool<PlayerClone>;
  private activeClone: PlayerClone | null = null; // Only one clone
  private container: Container;
  private fireTimer: number = 0;
  private waveConnectorGraphics: Graphics;
  private activeWaves: Projectile[][] = []; // Track each wave separately

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
  };

  private get fireCooldown(): number {
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
  update(dt: number, playerPos: Vec2, enemies: ReadonlySet<Enemy>, boss: Boss | null = null): void {
    // Update fire timer
    this.fireTimer -= dt;

    // Fire at nearest enemy
    if (this.fireTimer <= 0) {
      const nearestEnemy = this.findNearestEnemy(playerPos, enemies, boss);

      if (nearestEnemy) {
        this.fireAtTarget(playerPos, nearestEnemy.state.position);
        
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
        nearestEnemy = nearest ? nearest.state.position : undefined;
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
            this.fireAtTargetFromClone(clonePos, nearestEnemy.state.position);
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

    // Remove inactive waves and filter out inactive projectiles from each wave
    this.activeWaves = this.activeWaves
      .map(wave => wave.filter(p => p.state.active))
      .filter(wave => wave.length > 0);

    // Draw connectors between wave projectiles
    this.drawWaveConnectors();
  }

  /** Draw visual connectors between wave projectiles */
  private drawWaveConnectors(): void {
    this.waveConnectorGraphics.clear();

    // Draw each wave separately (don't connect different waves)
    for (const wave of this.activeWaves) {
      if (wave.length < 2) continue;

      // Draw lines connecting adjacent projectiles within this wave only
      for (let i = 0; i < wave.length - 1; i++) {
        const p1 = wave[i];
        const p2 = wave[i + 1];

        if (!p1 || !p2 || !p1.state.active || !p2.state.active) continue;

        const x1 = p1.state.position.x;
        const y1 = p1.state.position.y;
        const x2 = p2.state.position.x;
        const y2 = p2.state.position.y;

        // Outer glow
        this.waveConnectorGraphics.moveTo(x1, y1);
        this.waveConnectorGraphics.lineTo(x2, y2);
        this.waveConnectorGraphics.stroke({ width: 8, color: 0xFF00FF, alpha: 0.3 });

        // Middle layer
        this.waveConnectorGraphics.moveTo(x1, y1);
        this.waveConnectorGraphics.lineTo(x2, y2);
        this.waveConnectorGraphics.stroke({ width: 4, color: 0xFF00FF, alpha: 0.6 });

        // Core line
        this.waveConnectorGraphics.moveTo(x1, y1);
        this.waveConnectorGraphics.lineTo(x2, y2);
        this.waveConnectorGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.8 });
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

    // SHOTGUN MODE: Spread pattern or Line Wave
    const shotgunCount = this.weaponStats.shotgunCount;
    if (shotgunCount > 1) {
      // T3: Line Wave Mode - Creates a continuous 120° curved wave of piercing projectiles
      if (this.weaponStats.shotgunLineWaveMode) {
        // Create a new wave array for this shot
        const currentWave: Projectile[] = [];

        const baseAngle = Math.atan2(direction.y, direction.x);
        const arcRadians = (120 * Math.PI) / 180; // 120-degree arc
        const arcRadius = 80; // Radius of the curved arc formation
        const startDistance = -50; // Start behind player (negative = behind)
        
        // Create projectiles along a curved arc facing the aim direction
        for (let i = 0; i < shotgunCount; i++) {
          // Map i to parameter t (0 to 1)
          const t = i / (shotgunCount - 1 || 1); // Avoid division by zero
          
          // Calculate angle along the arc, centered on aim direction
          // Arc ranges from -60° to +60° relative to aim direction
          const curveAngle = baseAngle + (t - 0.5) * arcRadians;
          
          // Position projectile along the curved arc
          const offsetX = Math.cos(curveAngle) * arcRadius;
          const offsetY = Math.sin(curveAngle) * arcRadius;
          
          // Move starting position back behind the player
          const backwardX = Math.cos(baseAngle) * startDistance;
          const backwardY = Math.sin(baseAngle) * startDistance;
          
          const startX = from.x + offsetX + backwardX;
          const startY = from.y + offsetY + backwardY;
          
          // All projectiles move in the SAME direction (parallel to aim)
          const vx = direction.x * speed;
          const vy = direction.y * speed;
          
          this.spawnWaveProjectile(startX, startY, vx, vy, currentWave);
        }

        // Add this wave to the active waves list
        this.activeWaves.push(currentWave);
        return;
      }
      
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

  /** Spawn a wave projectile with infinite pierce for T3 shotgun */
  private spawnWaveProjectile(x: number, y: number, vx: number, vy: number, wave: Projectile[]): void {
    const proj = this.projectilePool.acquire();

    proj.activate(x, y, vx, vy, this.stats.damage);

    // Apply weapon upgrades with infinite pierce for wave
    proj.setUpgradeProperties(
      999, // Infinite pierce for continuous wave effect
      this.weaponStats.splitOnHit,
      this.weaponStats.explosiveRadius > 0,
      this.weaponStats.chainCount > 0,
      this.weaponStats.chainCount,
      this.weaponStats.homingStrength,
      this.weaponStats.piercingSizeBoost
    );

    // Hide individual projectile graphics (only show wave connectors)
    proj.container.visible = false;

    // Add this projectile to the current wave
    wave.push(proj);
  }

  /** Fire nova burst - Archimedean spiral flight paths (Directional T3) */
  private fireNovaBurst(from: Vec2, speed: number): void {
    const totalCount = this.weaponStats.directionalCount;
    const angleStep = (Math.PI * 2) / totalCount;
    
    // Spiral flight parameters
    const startRadius = 10;               // Start 10px from player
    const angularVelocity = Math.PI * 1.5; // ~270°/second (tight spiral)
    const growthRate = 15;                 // Radius grows 15px per radian
    const direction = 1;                   // Counter-clockwise
    
    for (let i = 0; i < totalCount; i++) {
      // Evenly space starting angles around player
      const startAngle = angleStep * i;
      
      // Spawn at starting position
      const spawnX = from.x + Math.cos(startAngle) * startRadius;
      const spawnY = from.y + Math.sin(startAngle) * startRadius;
      
      // Initial velocity (will be overridden by spiral behavior)
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
      
      // Enable Archimedean spiral flight
      proj.enableSpiralFlight(
        from,               // Spiral around player
        startAngle,         // Start at evenly-spaced angle
        startRadius,        // Start 10px from player
        angularVelocity,    // Rotation speed
        growthRate,         // Expansion speed
        direction           // Counter-clockwise
      );
      
      // Persist until leaving camera
      proj.state.ignoreLifetime = true;
    }
  }

  /** Spawn split projectiles from a hit */
  spawnSplitProjectiles(fromPos: Vec2): void {
    if (!this.weaponStats.splitOnHit) return;

    // Split count multiplies with shotgun count
    const totalSplits = this.weaponStats.splitCount * this.weaponStats.shotgunCount;
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

  /** Get all active meteorites for collision detection */
  getActiveMeteorites(): ReadonlySet<Meteorite> {
    return this.meteoritePool.getActive();
  }

  /** Get all active dragons for collision detection */
  getActiveDragons(): ReadonlySet<Dragon> {
    return this.dragonPool.getActive();
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
    const radius = this.weaponStats.explosiveRadius;
    const damage = this.stats.damage * GAME_CONFIG.UPGRADES.EXPLOSION_DAMAGE_MULT;
    const duration = this.weaponStats.meteoriteDuration;

    for (let i = 0; i < count; i++) {
      // Random angle around player
      const angle = Math.random() * Math.PI * 2;
      // Random distance from player (50% to 100% of spawn radius)
      const distance = spawnRadius * (0.5 + Math.random() * 0.5);
      
      const x = playerPos.x + Math.cos(angle) * distance;
      const y = playerPos.y + Math.sin(angle) * distance;
      
      this.spawnMeteorite({ x, y }, radius, damage, duration);
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
    this.clonePool.releaseAll();
    this.activeClone = null;
    this.fireTimer = 0;
    this.activeWaves = [];
    this.waveConnectorGraphics.clear();
    
    // Reset stats to default values
    this.stats.damage = GAME_CONFIG.CRIMSON_SHOT.DAMAGE;
    this.stats.fireRate = GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE;
    this.stats.speed = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;
    
    // Reset weapon upgrades
    this.weaponStats.shotgunCount = 1;
    this.weaponStats.shotgunWaveMode = false;
    this.weaponStats.shotgunLineWaveMode = false;
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
