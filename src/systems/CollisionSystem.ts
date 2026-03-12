// =============================================================================
// Collision System - Hit detection
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Player } from "@entities/Player";
import { EchoSystem } from "@systems/EchoSystem";
import { SpawnSystem } from "@systems/SpawnSystem";
import { XPSystem } from "@systems/XPSystem";
import { Enemy } from "@entities/Enemy";
import { LightningLink } from "@entities/LightningLink";
import { ObjectPool } from "@utils/pool";
import { circlesCollide, distance } from "@utils/math";
import type { Vec2 } from "@/types";

export interface CollisionResult {
  playerHit: boolean;
  playerDied: boolean;
  enemiesKilled: number;
  finalBossKilled: boolean; // Victory condition
}

export class CollisionSystem {
  private explosionContainer: Container;
  private lightningLinkPool: ObjectPool<LightningLink>;
  private lightningContainer: Container;

  constructor(parentContainer: Container) {
    this.explosionContainer = new Container();
    parentContainer.addChild(this.explosionContainer);

    // Lightning link pool for chain lightning visual effects
    this.lightningContainer = new Container();
    parentContainer.addChild(this.lightningContainer);
    
    this.lightningLinkPool = new ObjectPool<LightningLink>(
      () => {
        const link = new LightningLink();
        this.lightningContainer.addChild(link.container);
        return link;
      },
      (link) => link.reset(),
      10, // Initial pool size
      50  // Max pool size
    );
  }

  /** Check all collisions */
  checkCollisions(
    player: Player,
    echoSystem: EchoSystem,
    spawnSystem: SpawnSystem,
    xpSystem: XPSystem,
    gameTime: number
  ): CollisionResult {
    const result: CollisionResult = {
      playerHit: false,
      playerDied: false,
      enemiesKilled: 0,
      finalBossKilled: false,
    };

    const projectiles = echoSystem.getActiveProjectiles();
    const enemies = spawnSystem.getActiveEnemies();

    const playerPos = player.state.position;
    const playerRadius = GAME_CONFIG.PLAYER.SIZE / 2;
    const projectileRadius = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SIZE / 2;
    const enemyRadius = GAME_CONFIG.NIGHTLING.SIZE / 2;
    const bossRadius = GAME_CONFIG.BOSS.SIZE / 2;

    // Pierce cooldown: prevent projectile from hitting again too quickly
    const HIT_COOLDOWN = 0.15; // 150ms between hits

    // Check projectile vs enemy collisions
    for (const proj of projectiles) {
      if (!proj.state.active) continue;

      // Check if projectile recently hit something (cooldown prevents double-hits)
      const timeSinceLastHit = gameTime - proj.state.lastHitTime;
      if (timeSinceLastHit < HIT_COOLDOWN) {
        continue; // Skip collision check for this projectile
      }

      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        if (
          circlesCollide(
            proj.state.position,
            projectileRadius,
            enemy.state.position,
            enemyRadius
          )
        ) {
          // Hit!
          const killed = enemy.takeDamage(proj.state.damage);

          if (killed) {
            result.enemiesKilled++;
            // Spawn XP orb at enemy position
            xpSystem.spawnOrb(
              enemy.state.position.x,
              enemy.state.position.y,
              enemy.state.xpValue
            );
            spawnSystem.releaseEnemy(enemy);
          }

          // Handle explosion
          if (proj.state.isExplosive) {
            // In T3 meteorite mode, we do BOTH: instant explosion on hit + random meteorites spawn around player
            // The random meteorites are spawned in EchoSystem.update() when firing
            
            // Always do instant explosion on hit
            this.createExplosion(
              proj.state.position.x,
              proj.state.position.y,
              echoSystem.weaponStats.explosiveRadius,
              proj.state.damage * GAME_CONFIG.UPGRADES.EXPLOSION_DAMAGE_MULT,
              enemies,
              enemy,
              result,
              xpSystem,
              spawnSystem
            );
          }

          // Handle split (only on kill)
          if (proj.state.canSplit && killed) {
            echoSystem.spawnSplitProjectiles(proj.state.position);
          }

          // Handle chain lightning (instant damage to nearby enemies)
          if (proj.state.canChain && proj.state.chainCount > 0) {
            this.chainLightning(
              enemy.state.position,
              proj.state.damage * 0.7, // Chain damage is 70% of original
              proj.state.chainCount,
              enemy,
              enemies,
              result,
              xpSystem,
              spawnSystem,
              echoSystem,
              playerPos
            );
          }

          // Check if projectile should be destroyed (pierce system)
          const shouldDestroy = proj.markHit(gameTime);
          if (shouldDestroy) {
            echoSystem.releaseProjectile(proj);
          }

          break; // Move to next projectile
        }
      }
    }

    // Check projectile vs boss collisions
    const boss = spawnSystem.getActiveBoss();
    if (boss && boss.state.active) {
      for (const proj of projectiles) {
        if (!proj.state.active) continue;

        if (
          circlesCollide(
            proj.state.position,
            projectileRadius,
            boss.state.position,
            bossRadius
          )
        ) {
          // Hit boss!
          const killed = boss.takeDamage(proj.state.damage);

          if (killed) {
            result.enemiesKilled++;
            
            // Check if this is the final boss (type 2 at 5 minutes)
            if (boss.bossType === 2) {
              result.finalBossKilled = true;
            }
            
            // Spawn XP orb at boss position
            xpSystem.spawnOrb(
              boss.state.position.x,
              boss.state.position.y,
              boss.state.xpValue
            );
            spawnSystem.releaseBoss(boss);
          }

          // Handle explosion
          if (proj.state.isExplosive) {
            // In T3 meteorite mode, we do BOTH: instant explosion on hit + random meteorites spawn around player
            // The random meteorites are spawned in EchoSystem.update() when firing
            
            // Always do instant explosion on hit
            this.createExplosion(
              proj.state.position.x,
              proj.state.position.y,
              echoSystem.weaponStats.explosiveRadius,
              proj.state.damage * GAME_CONFIG.UPGRADES.EXPLOSION_DAMAGE_MULT,
              enemies,
              null,
              result,
              xpSystem,
              spawnSystem
            );
          }

          // Handle split (only on kill)
          if (proj.state.canSplit && killed) {
            echoSystem.spawnSplitProjectiles(proj.state.position);
          }

          // Check if projectile should be destroyed (pierce system)
          const shouldDestroy = proj.markHit(gameTime);
          if (shouldDestroy) {
            echoSystem.releaseProjectile(proj);
          }

          break; // Move to next projectile
        }
      }
    }

    // Check player laser beams vs enemy collisions (Piercing T3)
    const playerLaserBeams = echoSystem.getActiveLaserBeams();
    for (const beam of playerLaserBeams) {
      if (!beam.container.visible) continue;

      // Check laser beam vs regular enemies
      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        // Check if enemy is within laser beam path
        if (this.isPointNearLine(
          enemy.state.position,
          enemyRadius,
          beam.sourcePos,
          beam.targetPos
        )) {
          // Enemy hit by player laser!
          const killed = enemy.takeDamage(beam.damage);

          if (killed) {
            result.enemiesKilled++;
            xpSystem.spawnOrb(
              enemy.state.position.x,
              enemy.state.position.y,
              enemy.state.xpValue
            );
            spawnSystem.releaseEnemy(enemy);
          }
          // Laser doesn't get destroyed on hit (pierces everything)
        }
      }

      // Check laser beam vs boss
      if (boss && boss.state.active) {
        if (this.isPointNearLine(
          boss.state.position,
          bossRadius,
          beam.sourcePos,
          beam.targetPos
        )) {
          // Boss hit by player laser!
          const killed = boss.takeDamage(beam.damage);

          if (killed) {
            result.enemiesKilled++;
            
            // Check if this is the final boss (type 2 at 5 minutes)
            if (boss.bossType === 2) {
              result.finalBossKilled = true;
            }
            
            xpSystem.spawnOrb(
              boss.state.position.x,
              boss.state.position.y,
              boss.state.xpValue
            );
            spawnSystem.releaseBoss(boss);
          }
          // Laser doesn't get destroyed on hit (pierces everything)
        }
      }
    }

    // Check dragon vs enemy collisions (dragons pierce through all enemies)
    const dragons = echoSystem.getActiveDragons();
    for (const dragon of dragons) {
      if (!dragon.container.visible) continue;

      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        if (
          circlesCollide(
            dragon.position,
            dragon.radius,
            enemy.state.position,
            enemyRadius
          )
        ) {
          // Dragon hit enemy! Dragons pierce, so don't destroy dragon
          const killed = enemy.takeDamage(dragon.damage);

          if (killed) {
            result.enemiesKilled++;
            xpSystem.spawnOrb(
              enemy.state.position.x,
              enemy.state.position.y,
              enemy.state.xpValue
            );
            spawnSystem.releaseEnemy(enemy);
          }
        }
      }
    }

    // Check dragon vs boss collisions
    if (boss && boss.state.active) {
      for (const dragon of dragons) {
        if (!dragon.container.visible) continue;

        if (
          circlesCollide(
            dragon.position,
            dragon.radius,
            boss.state.position,
            bossRadius
          )
        ) {
          // Dragon hit boss! Dragons pierce, so don't destroy dragon
          const killed = boss.takeDamage(dragon.damage);

          if (killed) {
            result.enemiesKilled++;
            
            // Check if this is the final boss (type 2 at 5 minutes)
            if (boss.bossType === 2) {
              result.finalBossKilled = true;
            }
            
            xpSystem.spawnOrb(
              boss.state.position.x,
              boss.state.position.y,
              boss.state.xpValue
            );
            spawnSystem.releaseBoss(boss);
          }
        }
      }
    }

    // Check enemy vs player collisions
    if (!player.isInvincible()) {
      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        if (
          circlesCollide(
            playerPos,
            playerRadius,
            enemy.state.position,
            enemyRadius
          )
        ) {
          // Player hit!
          result.playerHit = true;
          result.playerDied = player.takeDamage(enemy.state.damage);

          // Destroy enemy on contact
          spawnSystem.releaseEnemy(enemy);

          if (result.playerDied) break;
        }
      }

      // Check boss vs player collision
      if (boss && boss.state.active) {
        if (
          circlesCollide(
            playerPos,
            playerRadius,
            boss.state.position,
            bossRadius
          )
        ) {
          // Player hit by boss!
          result.playerHit = true;
          result.playerDied = player.takeDamage(boss.state.damage);

          if (result.playerDied) return result;
        }
      }

      // Check boss projectiles vs player collision
      const bossProjectiles = spawnSystem.getActiveBossProjectiles();
      for (const proj of bossProjectiles) {
        if (!proj.state.active) continue;

        const projRadius = 4; // Boss projectile radius
        if (
          circlesCollide(
            playerPos,
            playerRadius,
            proj.state.position,
            projRadius
          )
        ) {
          // Player hit by boss projectile!
          result.playerHit = true;
          result.playerDied = player.takeDamage(proj.state.damage);
          proj.deactivate(); // Destroy projectile on hit

          if (result.playerDied) return result;
        }
      }

      // Check laser beams vs player collision (line-circle collision)
      const laserBeams = spawnSystem.getActiveLaserBeams();
      for (const beam of laserBeams) {
        if (!beam.container.visible) continue;

        // Check if player is within laser beam path
        if (this.isPointNearLine(
          playerPos,
          playerRadius,
          beam.sourcePos,
          beam.targetPos
        )) {
          // Player hit by laser beam!
          result.playerHit = true;
          result.playerDied = player.takeDamage(beam.damage);
          beam.container.visible = false; // Deactivate after hit

          if (result.playerDied) return result;
        }
      }
    }

    // Check meteorite vs enemy collisions (lingering damage areas)
    const meteorites = echoSystem.getActiveMeteorites();
    for (const meteorite of meteorites) {
      if (!meteorite.container.visible) continue;

      // Check if it's time to apply damage
      if (meteorite.shouldApplyDamage()) {
        // Damage all enemies in radius
        for (const enemy of enemies) {
          if (!enemy.state.active) continue;

          const dx = enemy.state.position.x - meteorite.position.x;
          const dy = enemy.state.position.y - meteorite.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= meteorite.radius) {
            const killed = enemy.takeDamage(meteorite.damage);
            if (killed) {
              result.enemiesKilled++;
              xpSystem.spawnOrb(
                enemy.state.position.x,
                enemy.state.position.y,
                enemy.state.xpValue
              );
              spawnSystem.releaseEnemy(enemy);
            }
          }
        }

        // Also check boss
        if (boss && boss.state.active) {
          const dx = boss.state.position.x - meteorite.position.x;
          const dy = boss.state.position.y - meteorite.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= meteorite.radius) {
            const killed = boss.takeDamage(meteorite.damage);
            if (killed) {
              result.enemiesKilled++;
              
              // Check if this is the final boss (type 2 at 5 minutes)
              if (boss.bossType === 2) {
                result.finalBossKilled = true;
              }
              
              xpSystem.spawnOrb(
                boss.state.position.x,
                boss.state.position.y,
                boss.state.xpValue
              );
              spawnSystem.releaseBoss(boss);
            }
          }
        }
      }
    }

    return result;
  }

  /** Check if a point (with radius) is near a line segment */
  private isPointNearLine(
    point: Vec2,
    radius: number,
    lineStart: Vec2,
    lineEnd: Vec2
  ): boolean {
    // Calculate distance from point to line segment
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      // Line segment is a point
      const dist = distance(point, lineStart);
      return dist <= radius;
    }

    // Project point onto line segment
    const t = Math.max(0, Math.min(1, (
      (point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy
    ) / lengthSq));

    const nearestX = lineStart.x + t * dx;
    const nearestY = lineStart.y + t * dy;

    const distSq = (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2;
    return distSq <= radius * radius;
  }

  /** 
   * Separate overlapping enemies by pushing them apart. Also separates enemies from boss.
   * This prevents entities from stacking on top of each other
   */
  separateEnemies(spawnSystem: SpawnSystem): void {
    const enemies = Array.from(spawnSystem.getActiveEnemies());
    const enemyRadius = GAME_CONFIG.NIGHTLING.SIZE / 2;
    const separationForce = 2.0; // How strongly to push enemies apart

    // Check each enemy against all other enemies
    for (let i = 0; i < enemies.length; i++) {
      const enemyA = enemies[i];
      if (!enemyA || !enemyA.state.active) continue;

      for (let j = i + 1; j < enemies.length; j++) {
        const enemyB = enemies[j];
        if (!enemyB || !enemyB.state.active) continue;

        // Check if enemies are overlapping
        const dx = enemyB.state.position.x - enemyA.state.position.x;
        const dy = enemyB.state.position.y - enemyA.state.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = enemyRadius * 2; // Combined radius
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq && distSq > 0.01) {
          // Enemies are overlapping, push them apart
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          
          // Normalize direction vector
          const nx = dx / dist;
          const ny = dy / dist;

          // Push each enemy half the overlap distance in opposite directions
          const pushDistance = (overlap / 2) * separationForce;

          enemyA.state.position.x -= nx * pushDistance;
          enemyA.state.position.y -= ny * pushDistance;
          enemyB.state.position.x += nx * pushDistance;
          enemyB.state.position.y += ny * pushDistance;
        }
      }
    }

    // Also check boss collision with enemies
    const boss = spawnSystem.getActiveBoss();
    if (boss && boss.state.active) {
      const bossRadius = GAME_CONFIG.BOSS.SIZE / 2;

      for (const enemy of enemies) {
        if (!enemy.state.active) continue;

        const dx = enemy.state.position.x - boss.state.position.x;
        const dy = enemy.state.position.y - boss.state.position.y;
        const distSq = dx * dx + dy * dy;
        const minDist = bossRadius + enemyRadius;
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq && distSq > 0.01) {
          // Enemy overlapping with boss, push enemy away
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          
          // Normalize direction vector
          const nx = dx / dist;
          const ny = dy / dist;

          // Push enemy away from boss (boss doesn't move)
          const pushDistance = overlap * separationForce;
          enemy.state.position.x += nx * pushDistance;
          enemy.state.position.y += ny * pushDistance;
        }
      }
    }
  }

  /** Chain lightning - recursively chains instant damage to nearby enemies with visual links */
  private chainLightning(
    fromPos: Vec2,
    damage: number,
    remainingChains: number,
    hitEnemy: Enemy,
    enemies: ReadonlySet<Enemy>,
    result: CollisionResult,
    xpSystem: XPSystem,
    spawnSystem: SpawnSystem,
    echoSystem: EchoSystem,
    playerPos: Vec2
  ): void {
    if (remainingChains <= 0) return;

    // Find nearest enemy within chain range
    let nearestEnemy: Enemy | null = null;
    let nearestDist: number = GAME_CONFIG.UPGRADES.CHAIN_RANGE;

    for (const enemy of enemies) {
      if (!enemy.state.active || enemy === hitEnemy) continue;

      const dist = distance(fromPos, enemy.state.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    // Spawn dragon if dragon mode is active and no next target found
    if (!nearestEnemy) {
      if (echoSystem.weaponStats.chainDragonMode) {
        echoSystem.spawnDragon(
          fromPos,
          playerPos,
          damage // Same damage as chain lightning
        );
      }
      return;
    }

    // Create visual lightning link
    const link = this.lightningLinkPool.acquire();
    link.activate(fromPos, nearestEnemy.state.position);

    // Instantly damage the target
    const killed = nearestEnemy.takeDamage(damage);

    if (killed) {
      result.enemiesKilled++;
      // Spawn XP orb
      xpSystem.spawnOrb(
        nearestEnemy.state.position.x,
        nearestEnemy.state.position.y,
        nearestEnemy.state.xpValue
      );
      spawnSystem.releaseEnemy(nearestEnemy);
    }

    // Continue the chain with reduced damage and count
    if (remainingChains > 1) {
      this.chainLightning(
        nearestEnemy.state.position,
        damage * 0.7, // Each chain does 70% of previous
        remainingChains - 1,
        nearestEnemy,
        enemies,
        result,
        xpSystem,
        spawnSystem,
        echoSystem,
        playerPos
      );
    } else {
      // Last chain - spawn dragon if dragon mode is active
      if (echoSystem.weaponStats.chainDragonMode) {
        echoSystem.spawnDragon(
          nearestEnemy.state.position,
          playerPos,
          damage // Same damage as chain lightning
        );
      }
    }
  }

  /** Create explosion effect and damage nearby enemies */
  private createExplosion(
    x: number,
    y: number,
    radius: number,
    damage: number,
    enemies: ReadonlySet<Enemy>,
    hitEnemy: Enemy | null,
    result: CollisionResult,
    xpSystem: XPSystem,
    spawnSystem: SpawnSystem
  ): void {
    // Visual explosion effect with outline
    const explosion = new Graphics();
    explosion.fill({ color: 0xFF6600, alpha: 0.5 }); // Orange explosion fill
    explosion.circle(0, 0, radius);
    explosion.stroke({ color: 0xFF3300, width: 2, alpha: 0.8 }); // Red outline
    explosion.circle(0, 0, radius);
    explosion.x = x;
    explosion.y = y;
    this.explosionContainer.addChild(explosion);

    // Animate explosion (fade out and remove)
    let lifetime = 0.3; // Slightly longer for better visibility
    const animate = (dt: number): void => {
      lifetime -= dt;
      explosion.alpha = lifetime / 0.3;
      if (lifetime <= 0) {
        this.explosionContainer.removeChild(explosion);
      }
    };

    // Store animation callback (we'll need to update this in game loop)
    (explosion as any).animate = animate;

    // Damage enemies in radius
    for (const enemy of enemies) {
      if (!enemy.state.active || enemy === hitEnemy) continue;

      const dx = enemy.state.position.x - x;
      const dy = enemy.state.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        const killed = enemy.takeDamage(damage);
        if (killed) {
          result.enemiesKilled++;
          xpSystem.spawnOrb(
            enemy.state.position.x,
            enemy.state.position.y,
            enemy.state.xpValue
          );
          spawnSystem.releaseEnemy(enemy);
        }
      }
    }
  }

  /** Update explosion animations */
  updateExplosions(dt: number): void {
    for (const child of this.explosionContainer.children) {
      const animate = (child as any).animate;
      if (animate) {
        animate(dt);
      }
    }
  }

  /** Update lightning link animations */
  updateLightningLinks(dt: number): void {
    const links = Array.from(this.lightningLinkPool.getActive());
    for (const link of links) {
      const shouldRemove = link.update(dt);
      if (shouldRemove) {
        this.lightningLinkPool.release(link);
      }
    }
  }
}
