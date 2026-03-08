// =============================================================================
// Weapon Upgrades Definitions - Multi-Tier System
// =============================================================================

import type { Upgrade } from "@/types";
import type { Game } from "@game/Game";

// =============================================================================
// Shotgun Weapon (3 Tiers)
// =============================================================================

const SHOTGUN_T1: Upgrade = {
  id: "shotgun_t1",
  name: "Shotgun I",
  description: "Fire 3 projectiles in a spread",
  type: "weapon",
  weaponId: "shotgun",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.shotgunCount = 3;
    game["weaponTiers"].set("shotgun", 1);
  },
};

const SHOTGUN_T2: Upgrade = {
  id: "shotgun_t2",
  name: "Shotgun II",
  description: "Fire 5 projectiles in a spread",
  type: "weapon",
  weaponId: "shotgun",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.shotgunCount = 5;
    game["weaponTiers"].set("shotgun", 2);
  },
};

const SHOTGUN_T3: Upgrade = {
  id: "shotgun_t3",
  name: "Crimson Wave",
  description: "120° curved wave with infinite pierce",
  type: "weapon",
  weaponId: "shotgun",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.shotgunCount = 20; // More projectiles for continuous wave
    game["echoSystem"].weaponStats.shotgunLineWaveMode = true; // 120° curved wave attack
    game["weaponTiers"].set("shotgun", 3);
  },
};

// =============================================================================
// Piercing Rounds Weapon (3 Tiers)
// =============================================================================

const PIERCING_T1: Upgrade = {
  id: "piercing_t1",
  name: "Piercing Rounds I",
  description: "Bigger, slower shots pierce 3 enemies",
  type: "weapon",
  weaponId: "piercing_rounds",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.pierceCount = 3;
    game["echoSystem"].weaponStats.piercingSizeBoost = 1.5; // 50% bigger
    game["echoSystem"].weaponStats.piercingSpeedPenalty = 0.7; // 30% slower
    game["weaponTiers"].set("piercing_rounds", 1);
  },
};

const PIERCING_T2: Upgrade = {
  id: "piercing_t2",
  name: "Piercing Rounds II",
  description: "Massive shots (4x size) pierce 4 enemies",
  type: "weapon",
  weaponId: "piercing_rounds",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.pierceCount = 4;
    game["echoSystem"].weaponStats.piercingSizeBoost = 4.0; // 300% bigger (4x size)
    game["echoSystem"].weaponStats.piercingSpeedPenalty = 0.5; // 50% slower
    game["weaponTiers"].set("piercing_rounds", 2);
  },
};

const PIERCING_T3: Upgrade = {
  id: "piercing_t3",
  name: "Piercing Rounds III",
  description: "Instant piercing laser beam",
  type: "weapon",
  weaponId: "piercing_rounds",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.pierceCount = 999; // Pierce everything (laser)
    game["echoSystem"].weaponStats.piercingSizeBoost = 1.0; // Base size (laser beam mode)
    game["echoSystem"].weaponStats.piercingSpeedPenalty = 1.0; // No speed penalty (instant)
    game["echoSystem"].weaponStats.piercingLaserMode = true; // Enable laser beam mode
    game["weaponTiers"].set("piercing_rounds", 3);
  },
};

// =============================================================================
// Split Shot Weapon (3 Tiers)
// =============================================================================

const SPLIT_SHOT_T1: Upgrade = {
  id: "split_shot_t1",
  name: "Split Shot I",
  description: "Projectiles split into 2 on kill",
  type: "weapon",
  weaponId: "split_shot",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.splitOnHit = true;
    game["echoSystem"].weaponStats.splitCount = 2;
    game["weaponTiers"].set("split_shot", 1);
  },
};

const SPLIT_SHOT_T2: Upgrade = {
  id: "split_shot_t2",
  name: "Split Shot II",
  description: "Split into 3 projectiles on kill",
  type: "weapon",
  weaponId: "split_shot",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.splitCount = 3;
    game["weaponTiers"].set("split_shot", 2);
  },
};

const SPLIT_SHOT_T3: Upgrade = {
  id: "split_shot_t3",
  name: "Split Shot III",
  description: "Split into 4 projectiles on kill",
  type: "weapon",
  weaponId: "split_shot",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.splitCount = 4;
    game["weaponTiers"].set("split_shot", 3);
  },
};

// =============================================================================
// Chain Lightning Weapon (3 Tiers)
// =============================================================================

const CHAIN_T1: Upgrade = {
  id: "chain_t1",
  name: "Chain Lightning I",
  description: "Chain to 1 nearby enemy",
  type: "weapon",
  weaponId: "chain_lightning",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.chainCount = 1;
    game["weaponTiers"].set("chain_lightning", 1);
  },
};

const CHAIN_T2: Upgrade = {
  id: "chain_t2",
  name: "Chain Lightning II",
  description: "Chain to 2 nearby enemies",
  type: "weapon",
  weaponId: "chain_lightning",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.chainCount = 2;
    game["weaponTiers"].set("chain_lightning", 2);
  },
};

const CHAIN_T3: Upgrade = {
  id: "chain_t3",
  name: "Chain Lightning III",
  description: "Chain to 4 enemies + spawn blue dragon",
  type: "weapon",
  weaponId: "chain_lightning",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.chainCount = 4;
    game["echoSystem"].weaponStats.chainDragonMode = true;
    game["weaponTiers"].set("chain_lightning", 3);
  },
};

// =============================================================================
// Explosive Rounds Weapon (3 Tiers)
// =============================================================================

const EXPLOSIVE_T1: Upgrade = {
  id: "explosive_t1",
  name: "Explosive Rounds I",
  description: "Small explosion on impact",
  type: "weapon",
  weaponId: "explosive_rounds",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.explosiveRadius = 20;
    game["weaponTiers"].set("explosive_rounds", 1);
  },
};

const EXPLOSIVE_T2: Upgrade = {
  id: "explosive_t2",
  name: "Explosive Rounds II",
  description: "Large explosion on impact",
  type: "weapon",
  weaponId: "explosive_rounds",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.explosiveRadius = 50;
    game["weaponTiers"].set("explosive_rounds", 2);
  },
};

const EXPLOSIVE_T3: Upgrade = {
  id: "explosive_t3",
  name: "Explosive Rounds III - Meteor Storm",
  description: "Explosions + random meteorites around player",
  type: "weapon",
  weaponId: "explosive_rounds",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.explosiveRadius = 60;
    game["echoSystem"].weaponStats.meteoriteMode = true; // Enable meteorite spawning
    game["echoSystem"].weaponStats.meteoriteDuration = 3.0; // 3 seconds of lingering damage
    game["echoSystem"].weaponStats.meteoriteCount = 2; // Spawn 2 meteorites per fire
    game["echoSystem"].weaponStats.meteoriteSpawnRadius = 150; // Spawn within 150px of player
    game["weaponTiers"].set("explosive_rounds", 3);
  },
};

// =============================================================================
// Homing Missiles Weapon (3 Tiers)
// =============================================================================

const HOMING_T1: Upgrade = {
  id: "homing_t1",
  name: "Homing Missiles I",
  description: "Weak tracking + 20% faster",
  type: "weapon",
  weaponId: "homing_missiles",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.homingStrength = 0.4;
    game["echoSystem"].weaponStats.homingSpeedBoost = 1.2; // 20% faster
    game["weaponTiers"].set("homing_missiles", 1);
  },
};

const HOMING_T2: Upgrade = {
  id: "homing_t2",
  name: "Homing Missiles II",
  description: "Strong tracking + 2x fire rate + 2x speed",
  type: "weapon",
  weaponId: "homing_missiles",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.homingStrength = 0.7;
    game["echoSystem"].weaponStats.homingSpeedBoost = 2.0; // 2x speed
    game["echoSystem"].weaponStats.fireRateMultiplier = 2.0; // 2x fire rate
    game["weaponTiers"].set("homing_missiles", 2);
  },
};

const HOMING_T3: Upgrade = {
  id: "homing_t3",
  name: "Homing Missiles III",
  description: "Perfect tracking + spawn player clone",
  type: "weapon",
  weaponId: "homing_missiles",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.homingStrength = 1.0;
    game["echoSystem"].weaponStats.homingSpeedBoost = 1.6; // 60% faster
    game["echoSystem"].weaponStats.homingCloneMode = true;
    game["weaponTiers"].set("homing_missiles", 3);
  },
};

// =============================================================================
// Directional Shot Weapon (3 Tiers) - Forward-firing burst
// =============================================================================

const DIRECTIONAL_SHOT_T1: Upgrade = {
  id: "directional_shot_t1",
  name: "Directional Shot I",
  description: "Fire 4 projectiles in 360°",
  type: "weapon",
  weaponId: "directional_shot",
  tier: 1,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.directionalMode = true;
    game["echoSystem"].weaponStats.directionalCount = 4;
    game["weaponTiers"].set("directional_shot", 1);
  },
};

const DIRECTIONAL_SHOT_T2: Upgrade = {
  id: "directional_shot_t2",
  name: "Directional Shot II",
  description: "Fire 8 projectiles in 360°",
  type: "weapon",
  weaponId: "directional_shot",
  tier: 2,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.directionalCount = 8;
    game["weaponTiers"].set("directional_shot", 2);
  },
};

const DIRECTIONAL_SHOT_T3: Upgrade = {
  id: "directional_shot_t3",
  name: "Orbital Nova",
  description: "12 projectiles spiral outward in an expanding pattern",
  type: "weapon",
  weaponId: "directional_shot",
  tier: 3,
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.directionalCount = 12;
    game["echoSystem"].weaponStats.directionalNovaMode = true;
    game["echoSystem"].weaponStats.directionalNovaSpawnRadius = 40;
    game["echoSystem"].weaponStats.directionalNovaOrbitDuration = 9999; // Orbit forever (never fly away)
    game["echoSystem"].weaponStats.directionalNovaOrbitSpeed = Math.PI * 2; // Full rotation per second
    game["weaponTiers"].set("directional_shot", 3);
  },
};

// =============================================================================
// Stat Upgrades (Available at all levels, can be taken multiple times)
// =============================================================================

const DAMAGE_BOOST: Upgrade = {
  id: "damage_boost",
  name: "Damage Boost",
  description: "+50% damage",
  type: "stat",
  apply: (game: Game) => {
    const currentDamage = game["echoSystem"].stats.damage;
    game["echoSystem"].stats.damage = Math.round(currentDamage * 1.5) as typeof currentDamage;
  },
};

const SPEED_BOOST: Upgrade = {
  id: "speed_boost",
  name: "Speed Boost",
  description: "+20% movement speed",
  type: "stat",
  apply: (game: Game) => {
    game["player"].stats.speed *= 1.2;
  },
};

const RAPID_FIRE: Upgrade = {
  id: "rapid_fire",
  name: "Rapid Fire",
  description: "+30% fire rate",
  type: "stat",
  apply: (game: Game) => {
    game["echoSystem"].weaponStats.fireRateMultiplier += 0.3;
  },
};

// =============================================================================
// Heal Upgrade (Available at all non-weapon levels)
// =============================================================================

const HEAL: Upgrade = {
  id: "heal",
  name: "Heal",
  description: "Restore 3 health",
  type: "heal",
  apply: (game: Game) => {
    const player = game["player"];
    player.state.health = Math.min(
      player.state.health + 3,
      player.state.maxHealth
    );
  },
};

// =============================================================================
// Weapon Upgrade Registry
// =============================================================================

/** All weapon base upgrades (tier 1) */
export const BASE_WEAPON_UPGRADES: Upgrade[] = [
  SHOTGUN_T1,
  PIERCING_T1,
  SPLIT_SHOT_T1,
  CHAIN_T1,
  EXPLOSIVE_T1,
  HOMING_T1,
  DIRECTIONAL_SHOT_T1,
];

/** Weapon tier upgrade map: weaponId -> [tier1, tier2, tier3] */
export const WEAPON_TIER_UPGRADES: Map<string, [Upgrade, Upgrade, Upgrade]> = new Map([
  ["shotgun", [SHOTGUN_T1, SHOTGUN_T2, SHOTGUN_T3]],
  ["piercing_rounds", [PIERCING_T1, PIERCING_T2, PIERCING_T3]],
  ["split_shot", [SPLIT_SHOT_T1, SPLIT_SHOT_T2, SPLIT_SHOT_T3]],
  ["chain_lightning", [CHAIN_T1, CHAIN_T2, CHAIN_T3]],
  ["explosive_rounds", [EXPLOSIVE_T1, EXPLOSIVE_T2, EXPLOSIVE_T3]],
  ["homing_missiles", [HOMING_T1, HOMING_T2, HOMING_T3]],
  ["directional_shot", [DIRECTIONAL_SHOT_T1, DIRECTIONAL_SHOT_T2, DIRECTIONAL_SHOT_T3]],
]);

/** All stat upgrades (can be taken multiple times) */
export const STAT_UPGRADES: Upgrade[] = [
  DAMAGE_BOOST,
  SPEED_BOOST,
  RAPID_FIRE,
];

/** Heal upgrade */
export const HEAL_UPGRADE: Upgrade = HEAL;

// =============================================================================
// Upgrade Selection Logic
// =============================================================================

/** 
 * Get random upgrades for level-up choice.
 * - Levels 2, 5, 8: Weapon base upgrades (tier 1) or weapon tier upgrades
 * - Other levels: Stat upgrades (repeatable), heal (repeatable), or weapon tier upgrades
 * - Weapon upgrades cannot be duplicated, but stat/heal can be taken multiple times
 */
export function getRandomUpgrades(
  count: number,
  currentLevel: number,
  acquiredUpgradeIds: Set<string>,
  weaponTiers: Map<string, number>
): Upgrade[] {
  // Determine if this is a weapon unlock level
  const isWeaponLevel = currentLevel === 2 || currentLevel === 5 || currentLevel === 8;

  const availableUpgrades: Upgrade[] = [];

  if (isWeaponLevel) {
    // Levels 2, 5, 8: Show base weapon upgrades (tier 1) that haven't been acquired
    for (const weapon of BASE_WEAPON_UPGRADES) {
      if (!weaponTiers.has(weapon.weaponId!)) {
        availableUpgrades.push(weapon);
      }
    }

    // Also show tier upgrades for weapons the player already has
    for (const [weaponId, currentTier] of weaponTiers.entries()) {
      if (currentTier < 3) {
        const tiers = WEAPON_TIER_UPGRADES.get(weaponId);
        if (tiers && tiers[currentTier]) {
          // currentTier is 1 or 2, so tiers[1] is tier 2, tiers[2] is tier 3
          availableUpgrades.push(tiers[currentTier]);
        }
      }
    }
  } else {
    // Other levels: Show stat upgrades (always available) and heal (always available)
    availableUpgrades.push(...STAT_UPGRADES, HEAL_UPGRADE);

    // Also show tier upgrades for weapons the player already has
    for (const [weaponId, currentTier] of weaponTiers.entries()) {
      if (currentTier < 3) {
        const tiers = WEAPON_TIER_UPGRADES.get(weaponId);
        if (tiers && tiers[currentTier]) {
          availableUpgrades.push(tiers[currentTier]);
        }
      }
    }
  }

  // Filter out already-acquired upgrades (but keep stat and heal upgrades, which are repeatable)
  const filtered = availableUpgrades.filter(
    (upgrade) => upgrade.type === "stat" || upgrade.type === "heal" || !acquiredUpgradeIds.has(upgrade.id)
  );

  // If fewer upgrades are available than requested, return all available
  if (filtered.length <= count) {
    return [...filtered];
  }

  // Shuffle and return requested count
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
