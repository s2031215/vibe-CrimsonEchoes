// =============================================================================
// Game Configuration
// =============================================================================

export const GAME_CONFIG = {
  // Display
  WIDTH: 480,
  HEIGHT: 270,
  SCALE: 2,
  BACKGROUND_COLOR: 0x000000, // Pure black - classic arcade style

  // Player
  PLAYER: {
    MAX_HEALTH: 10,
    SPEED: 120,
    DASH_SPEED: 400,
    DASH_DURATION: 0.15,
    DASH_COOLDOWN: 2.0,
    INVINCIBILITY_TIME: 0.5,
    SIZE: 16, // Classic arcade size
  },

  // Crimson Shot Echo
  CRIMSON_SHOT: {
    DAMAGE: 1,
    FIRE_RATE: 1.2, // shots per second
    PROJECTILE_SPEED: 200,
    PROJECTILE_LIFETIME: 2.0,
    PROJECTILE_SIZE: 6, // Small and simple
  },

  // Nightling Enemy (Security Bot)
  NIGHTLING: {
    HEALTH: 1,
    SPEED: 40,
    DAMAGE: 1,
    XP_VALUE: 1,
    SIZE: 16, // Classic arcade size
  },

  // Spawning
  SPAWN: {
    BASE_RATE: 0.8, // enemies per second (reduced from 1.5)
    RATE_SCALE_PER_MINUTE: 0.8, // Spawn rate increase per minute (reduced from 1.5)
    RATE_BOOST_AFTER_3MIN: 2.0, // Multiplier for spawn rate after 3 minutes
    SPAWN_MARGIN: 32, // pixels off-screen
    HEALTH_SCALE_PER_MINUTE: 0.5, // +50% health per minute
    HEALTH_BOOST_AFTER_3MIN: 2.0, // Multiplier for HP after 3 minutes
    SPEED_SCALE_PER_MINUTE: 0.2, // +20% speed per minute
  },

  // XP & Leveling
  XP: {
    ORB_SIZE: 3, // Smaller for cyberpunk data chip aesthetic
    MAGNET_RANGE: 50,
    MAGNET_SPEED: 150,
    LEVELS: [0, 10, 25, 50, 100, 175, 275, 400, 550, 725, 925],
  },

  // Weapon Upgrades
  UPGRADES: {
    SHOTGUN_SPREAD: 30, // Degrees of spread for T1-T2 shotgun
    SHOTGUN_WAVE_SPREAD: 120, // Degrees of spread for T3 shotgun wave
    PIERCE_COUNT: 3, // How many enemies to pierce
    SPLIT_COUNT: 2, // Number of split projectiles
    CHAIN_COUNT: 3, // Number of chain bounces
    CHAIN_RANGE: 100, // Range to find chain targets
    EXPLOSION_RADIUS: 30, // Explosion AoE radius
    EXPLOSION_DAMAGE_MULT: 0.5, // Explosion damage multiplier
    METEORITE_RADIUS: 60, // Meteorite damage area radius
    METEORITE_TICK_RATE: 0.5, // Damage tick rate (seconds)
    FIRE_RATE_BOOST: 0.5, // +50% fire rate
    HOMING_STRENGTH: 0.8, // Homing turn rate (0-1)
    HOMING_TURN_SPEED: 180, // Degrees per second
    DIRECTIONAL_COUNT: 8, // Number of projectiles in directional blast
  },

  // Boss
  BOSS: {
    HEALTH: 100,
    SPEED: 30,
    DAMAGE: 2,
    XP_VALUE: 50,
    SIZE: 48, // 3x normal enemy size
    SPAWN_TIME: 60, // Spawn boss every 60 seconds
  },

  // Game Rules
  SURVIVAL_TIME: 360, // 6 minutes in seconds
  MAX_PROJECTILES: 100,
  MAX_ENEMIES: 200,
} as const;

export type GameConfig = typeof GAME_CONFIG;
