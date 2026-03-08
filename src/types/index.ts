// =============================================================================
// Core Type Definitions
// =============================================================================

/** 2D Vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** Entity with position and velocity */
export interface EntityState {
  position: Vec2;
  velocity: Vec2;
  active: boolean;
}

/** Player state */
export interface PlayerState extends EntityState {
  health: number;
  maxHealth: number;
  invincibilityTimer: number;
  dashCooldownTimer: number;
  isDashing: boolean;
  dashTimer: number;
}

/** Projectile state */
export interface ProjectileState extends EntityState {
  damage: number;
  lifetime: number;
  pierce: number; // Number of enemies it can pass through (0 = hit once)
  pierceCount: number; // Current pierce count
  canSplit: boolean; // Can split on hit
  isExplosive: boolean; // Explodes on impact
  canChain: boolean; // Can chain to nearby enemies
  chainCount: number; // Number of chains left
  homingStrength: number; // 0 = no homing, 1 = full homing
  targetEnemy: { x: number; y: number } | undefined; // Current homing target
  hasTrail: boolean; // Show trailing particle effect
  trailPositions: Vec2[]; // Previous positions for trail rendering
  isOrbiting: boolean; // Orbits around origin point like a solar system
  orbitCenter: Vec2 | undefined; // Center point to orbit around
  orbitAngle: number; // Current angle in orbit (radians)
  orbitRadius: number; // Distance from orbit center
  orbitSpeed: number; // Angular velocity (radians per second)
  orbitDuration: number; // How long to orbit before flying away
  orbitTimer: number; // Time spent orbiting
  ignoreLifetime: boolean; // Persists until leaving screen instead of timing out
  // Archimedean spiral flight properties
  isSpiralFlight: boolean; // Projectile flies in spiral path
  spiralCenter: Vec2 | undefined; // Center point to spiral around
  spiralAngle: number; // Current angle in spiral (radians)
  spiralAngularVelocity: number; // How fast angle increases (rad/s)
  spiralGrowthRate: number; // How fast radius grows (k parameter)
  spiralStartRadius: number; // Initial radius (r₀)
  spiralDirection: number; // 1 = CCW, -1 = CW
}

/** Enemy state */
export interface EnemyState extends EntityState {
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  xpValue: number;
}

/** XP Orb state */
export interface XPOrbState extends EntityState {
  value: number;
  magnetized: boolean;
}

/** Game state machine */
export type GameState = "loading" | "playing" | "paused" | "gameover" | "victory" | "levelup";

/** Keyboard input state */
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
  dashPressed: boolean; // For edge detection
  levelUpCheat: boolean;
  levelUpCheatPressed: boolean; // For edge detection
}

/** XP and leveling state */
export interface ProgressionState {
  xp: number;
  level: number;
  xpToNextLevel: number;
}

/** Upgrade types */
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "stat" | "heal";
  weaponId?: string; // For weapon tier upgrades (e.g., "multi_shot")
  tier?: number; // For weapon tier upgrades (1, 2, or 3)
  apply: (game: any) => void;
}

/** Weapon upgrade stats */
export interface WeaponStats {
  shotgunCount: number; // Number of projectiles per shot (spread pattern, default 1)
  shotgunWaveMode: boolean; // T3: 120° wave instead of narrow spread (deprecated, use lineWaveMode)
  shotgunLineWaveMode: boolean; // T3: Line wave attack
  shotgunWavePierce: number; // T3: Pierce count for wave projectiles (0 = no pierce)
  pierceCount: number; // How many enemies to pierce through
  piercingSizeBoost: number; // Projectile size multiplier for piercing (1.0 = normal)
  piercingSpeedPenalty: number; // Speed multiplier for piercing (1.0 = normal, 0.7 = 30% slower)
  piercingLaserMode: boolean; // Tier 3: Transform into instant laser beam
  splitOnHit: boolean; // Split into multiple projectiles on hit
  splitCount: number; // Number of split projectiles (default 2)
  explosiveRadius: number; // Explosion radius on impact (0 = no explosion)
  meteoriteMode: boolean; // T3: Spawn random meteorites around player
  meteoriteDuration: number; // Duration of meteorite damage area (seconds)
  meteoriteCount: number; // Number of meteorites to spawn per fire
  meteoriteSpawnRadius: number; // Radius around player to spawn meteorites
  chainCount: number; // Number of times to chain to nearby enemies
  chainDragonMode: boolean; // T3: Spawn blue dragon at last chain target
  fireRateMultiplier: number; // Multiply fire rate (1.0 = normal)
  homingStrength: number; // 0-1, how strongly projectiles home
  homingSpeedBoost: number; // Speed multiplier for homing missiles (1.0 = normal)
  homingCloneMode: boolean; // T3: Spawn player clone that attacks enemies
  directionalMode: boolean; // Fire in 360° burst
  directionalCount: number; // Number of projectiles in directional burst (default 4)
  directionalNovaMode: boolean; // T3: Expanding ring with trails
  directionalNovaSpawnRadius: number; // T3: Radius to spawn nova projectiles around player
  directionalNovaOrbitDuration: number; // T3: How long projectiles orbit before flying away (seconds)
  directionalNovaOrbitSpeed: number; // T3: Angular velocity for orbiting (radians/sec)
}

/** Result type for expected failures */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
