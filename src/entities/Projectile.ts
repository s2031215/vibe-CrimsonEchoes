// =============================================================================
// Projectile Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { ProjectileState } from "@/types";

export class Projectile {
  public state: ProjectileState;
  public container: Container;
  private graphics: Graphics;
  private trailGraphics: Graphics;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      damage: GAME_CONFIG.CRIMSON_SHOT.DAMAGE,
      lifetime: GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME,
      pierce: 0,
      pierceCount: 0,
      canSplit: false,
      isExplosive: false,
      canChain: false,
      chainCount: 0,
      homingStrength: 0,
      targetEnemy: undefined,
      hasTrail: false,
      trailPositions: [],
      isOrbiting: false,
      orbitCenter: undefined,
      orbitAngle: 0,
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitDuration: 0,
      orbitTimer: 0,
      ignoreLifetime: false,
      isSpiralFlight: false,
      spiralCenter: undefined,
      spiralAngle: 0,
      spiralAngularVelocity: 0,
      spiralGrowthRate: 0,
      spiralStartRadius: 0,
      spiralDirection: 1,
    };

    this.container = new Container();
    this.graphics = this.createProjectileGraphics();
    this.trailGraphics = new Graphics();
    this.container.addChild(this.trailGraphics);
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  private createProjectileGraphics(): Graphics {
    const g = new Graphics();
    
    // SPACE LASER - SIMPLE LINE STYLE
    // Thin laser beam like classic space shooters
    
    // Outer glow (cyan)
    g.fill({ color: 0x00ffff, alpha: 0.4 }); // Cyan glow
    g.rect(-1, -4, 2, 8);
    
    // Main laser body (bright cyan)
    g.fill(0x00ffff); // Cyan laser
    g.rect(-0.5, -3, 1, 6);
    
    // White hot core
    g.fill(0xffffff);
    g.rect(-0.5, -2, 1, 4);

    return g;
  }

  /** Activate projectile and orient it toward direction of travel */
  activate(x: number, y: number, vx: number, vy: number, damage: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = vx;
    this.state.velocity.y = vy;
    this.state.damage = damage;
    this.state.lifetime = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME;
    this.state.active = true;
    this.state.pierceCount = 0;
    this.state.targetEnemy = undefined;
    this.container.visible = true;

    // Rotate laser to point in direction of travel
    this.graphics.rotation = Math.atan2(vy, vx) + Math.PI / 2; // +90deg for vertical laser

    this.updatePosition();
  }

  /** Deactivate projectile */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
    this.state.trailPositions = [];
    this.trailGraphics.clear();
    
    // Reset spiral properties
    this.state.isSpiralFlight = false;
    this.state.spiralCenter = undefined;
    this.state.spiralAngle = 0;
  }

  /** Update projectile state */
  update(
    dt: number,
    nearestEnemy: { x: number; y: number } | undefined = undefined,
    playerPos: { x: number; y: number } | undefined = undefined
  ): boolean {
    if (!this.state.active) return false;

    // Update lifetime - check camera-relative bounds if ignoreLifetime is enabled
    if (this.state.ignoreLifetime) {
      // Check if projectile has left the camera viewport
      // Viewport is 480x270, so check if projectile is outside camera view
      if (playerPos) {
        const halfViewportWidth = GAME_CONFIG.WIDTH / 2;
        const halfViewportHeight = GAME_CONFIG.HEIGHT / 2;
        const margin = 50; // Extra margin for smooth despawn
        
        const dx = Math.abs(this.state.position.x - playerPos.x);
        const dy = Math.abs(this.state.position.y - playerPos.y);
        
        if (dx > halfViewportWidth + margin || dy > halfViewportHeight + margin) {
          this.deactivate();
          return false;
        }
      }
    } else {
      // Normal lifetime behavior
      this.state.lifetime -= dt;
      if (this.state.lifetime <= 0) {
        this.deactivate();
        return false;
      }
    }

    // Update trail positions if trail is enabled
    if (this.state.hasTrail) {
      // Add current position to trail
      this.state.trailPositions.push({ x: this.state.position.x, y: this.state.position.y });
      
      // Keep only last 8 positions for trail
      if (this.state.trailPositions.length > 8) {
        this.state.trailPositions.shift();
      }
      
      // Draw trail effect
      this.drawTrail();
    }

    // ORBITAL BEHAVIOR - Like a solar system
    if (this.state.isOrbiting) {
      // Update orbit center to follow player position
      if (playerPos) {
        this.state.orbitCenter = { x: playerPos.x, y: playerPos.y };
      }
      
      if (!this.state.orbitCenter) {
        // Fallback: stop orbiting if no center defined
        this.state.isOrbiting = false;
      } else {
        this.state.orbitTimer += dt;

        // Check if orbit duration is complete
        if (this.state.orbitTimer >= this.state.orbitDuration) {
          // Stop orbiting, fly away in a SPIRAL/SWIRL pattern
          this.state.isOrbiting = false;
          
          // Calculate tangent direction (perpendicular to radius) for spiral effect
          const radialX = this.state.position.x - this.state.orbitCenter.x;
          const radialY = this.state.position.y - this.state.orbitCenter.y;
          const dist = Math.sqrt(radialX * radialX + radialY * radialY);
          
          if (dist > 0) {
            // Tangent direction (perpendicular to radial direction)
            const tangentX = -radialY / dist;
            const tangentY = radialX / dist;
            
            // Radial direction (outward)
            const radialNormX = radialX / dist;
            const radialNormY = radialY / dist;
            
            // Mix tangent and radial for spiral effect (60% tangent, 40% radial)
            const speed = Math.sqrt(this.state.velocity.x ** 2 + this.state.velocity.y ** 2);
            this.state.velocity.x = (tangentX * 0.6 + radialNormX * 0.4) * speed;
            this.state.velocity.y = (tangentY * 0.6 + radialNormY * 0.4) * speed;
          }
        } else {
          // Continue orbiting around CURRENT player position
          this.state.orbitAngle += this.state.orbitSpeed * dt;
          
          // Update position based on orbit around player
          this.state.position.x = this.state.orbitCenter.x + Math.cos(this.state.orbitAngle) * this.state.orbitRadius;
          this.state.position.y = this.state.orbitCenter.y + Math.sin(this.state.orbitAngle) * this.state.orbitRadius;
          
          // Update velocity for smooth animation
          this.state.velocity.x = -Math.sin(this.state.orbitAngle) * this.state.orbitSpeed * this.state.orbitRadius;
          this.state.velocity.y = Math.cos(this.state.orbitAngle) * this.state.orbitSpeed * this.state.orbitRadius;
          
          // Update rotation to match movement direction
          this.graphics.rotation = Math.atan2(this.state.velocity.y, this.state.velocity.x) + Math.PI / 2;
          
          this.updatePosition();
          return true;
        }
      }
    }

    // ARCHIMEDEAN SPIRAL FLIGHT - Projectile curves around center in expanding spiral
    if (this.state.isSpiralFlight && this.state.spiralCenter) {
      // Update spiral center to follow player
      if (playerPos) {
        this.state.spiralCenter = { x: playerPos.x, y: playerPos.y };
      }

      // Update spiral angle over time
      this.state.spiralAngle += this.state.spiralAngularVelocity * this.state.spiralDirection * dt;
      
      // Calculate radius based on Archimedean spiral formula: r = r₀ + k * θ
      const currentRadius = this.state.spiralStartRadius + 
                            (this.state.spiralGrowthRate * Math.abs(this.state.spiralAngle));
      
      // Update position in polar coordinates
      this.state.position.x = this.state.spiralCenter.x + 
                              Math.cos(this.state.spiralAngle) * currentRadius;
      this.state.position.y = this.state.spiralCenter.y + 
                              Math.sin(this.state.spiralAngle) * currentRadius;
      
      // Calculate velocity for trail effect and rotation
      // Derivative of spiral: velocity has both radial and tangential components
      const radialVelocity = this.state.spiralGrowthRate * this.state.spiralAngularVelocity;
      const tangentialVelocity = currentRadius * this.state.spiralAngularVelocity;
      
      // Velocity in polar to cartesian
      const radialX = Math.cos(this.state.spiralAngle);
      const radialY = Math.sin(this.state.spiralAngle);
      const tangentX = -radialY * this.state.spiralDirection;
      const tangentY = radialX * this.state.spiralDirection;
      
      this.state.velocity.x = radialX * radialVelocity + tangentX * tangentialVelocity;
      this.state.velocity.y = radialY * radialVelocity + tangentY * tangentialVelocity;
      
      // Update rotation to match movement direction
      this.graphics.rotation = Math.atan2(this.state.velocity.y, this.state.velocity.x) + Math.PI / 2;
      
      this.updatePosition();
      return true;
    }

    // Homing behavior (only when not orbiting)
    if (this.state.homingStrength > 0 && nearestEnemy && !this.state.isOrbiting) {
      const dx = nearestEnemy.x - this.state.position.x;
      const dy = nearestEnemy.y - this.state.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // Calculate desired direction
        const targetVelX = (dx / dist) * GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;
        const targetVelY = (dy / dist) * GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED;

        // Lerp toward target direction based on homing strength
        const turnRate = this.state.homingStrength * dt * 5; // Adjust turn speed
        this.state.velocity.x += (targetVelX - this.state.velocity.x) * turnRate;
        this.state.velocity.y += (targetVelY - this.state.velocity.y) * turnRate;

        // Update rotation to match velocity
        this.graphics.rotation = Math.atan2(this.state.velocity.y, this.state.velocity.x) + Math.PI / 2;
      }
    }

    // Update position (normal movement when not orbiting)
    if (!this.state.isOrbiting) {
      this.state.position.x += this.state.velocity.x * dt;
      this.state.position.y += this.state.velocity.y * dt;
    }

    this.updatePosition();
    return true;
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  /** Draw trail effect behind projectile */
  private drawTrail(): void {
    this.trailGraphics.clear();

    if (this.state.trailPositions.length < 2) return;

    // Draw trail with fading particles
    for (let i = 0; i < this.state.trailPositions.length; i++) {
      const pos = this.state.trailPositions[i];
      if (!pos) continue; // Skip if undefined
      
      const alpha = (i + 1) / this.state.trailPositions.length; // Fade from old to new
      const size = 2 + (alpha * 3); // Grow from 2 to 5 pixels
      
      // Cyan glow with fading alpha
      this.trailGraphics.circle(
        pos.x - this.state.position.x, // Relative to projectile position
        pos.y - this.state.position.y,
        size
      );
      this.trailGraphics.fill({ color: 0x00ffff, alpha: alpha * 0.6 });
      
      // Bright white core
      this.trailGraphics.circle(
        pos.x - this.state.position.x,
        pos.y - this.state.position.y,
        size * 0.5
      );
      this.trailGraphics.fill({ color: 0xffffff, alpha: alpha * 0.8 });
    }
  }

  /** Reset for pooling */
  reset(): void {
    this.state.active = false;
    this.state.lifetime = 0;
    this.state.pierceCount = 0;
    this.state.targetEnemy = undefined;
    this.state.hasTrail = false;
    this.state.trailPositions = [];
    this.state.isOrbiting = false;
    this.state.orbitCenter = undefined;
    this.state.orbitAngle = 0;
    this.state.orbitRadius = 0;
    this.state.orbitSpeed = 0;
    this.state.orbitDuration = 0;
    this.state.orbitTimer = 0;
    this.state.ignoreLifetime = false;
    this.state.isSpiralFlight = false;
    this.state.spiralCenter = undefined;
    this.state.spiralAngle = 0;
    this.state.spiralAngularVelocity = 0;
    this.state.spiralGrowthRate = 0;
    this.state.spiralStartRadius = 0;
    this.state.spiralDirection = 1;
    this.container.visible = false;
    this.graphics.scale.set(1, 1); // Reset scale
    this.trailGraphics.clear();
  }

  /** Enable Archimedean spiral flight path */
  enableSpiralFlight(
    center: { x: number; y: number },
    startAngle: number,
    startRadius: number,
    angularVelocity: number,
    growthRate: number,
    direction: number
  ): void {
    this.state.isSpiralFlight = true;
    this.state.spiralCenter = { x: center.x, y: center.y };
    this.state.spiralAngle = startAngle;
    this.state.spiralStartRadius = startRadius;
    this.state.spiralAngularVelocity = angularVelocity;
    this.state.spiralGrowthRate = growthRate;
    this.state.spiralDirection = direction;
  }

  /** Mark that this projectile hit an enemy (for pierce tracking) */
  markHit(): boolean {
    this.state.pierceCount++;
    // Return true if projectile should be deactivated
    return this.state.pierceCount > this.state.pierce;
  }

  /** Set weapon upgrade properties */
  setUpgradeProperties(
    pierce: number,
    canSplit: boolean,
    isExplosive: boolean,
    canChain: boolean,
    chainCount: number,
    homingStrength: number,
    sizeMultiplier: number = 1.0
  ): void {
    this.state.pierce = pierce;
    this.state.canSplit = canSplit;
    this.state.isExplosive = isExplosive;
    this.state.canChain = canChain;
    this.state.chainCount = chainCount;
    this.state.homingStrength = homingStrength;
    
    // Apply size multiplier
    this.graphics.scale.set(sizeMultiplier, sizeMultiplier);
  }
}
