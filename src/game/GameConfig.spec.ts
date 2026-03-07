// =============================================================================
// GameConfig Tests
// =============================================================================

import { describe, it, expect } from "vitest";
import { GAME_CONFIG } from "@game/GameConfig";

describe("GAME_CONFIG", () => {
  describe("Display settings", () => {
    it("has correct canvas dimensions", () => {
      expect(GAME_CONFIG.WIDTH).toBe(480);
      expect(GAME_CONFIG.HEIGHT).toBe(270);
    });

    it("has 2x scale for pixel art", () => {
      expect(GAME_CONFIG.SCALE).toBe(2);
    });

    it("has dark background color", () => {
      expect(GAME_CONFIG.BACKGROUND_COLOR).toBe(0x000000); // Pure black - 1980s arcade style
    });
  });

  describe("Player settings", () => {
    it("has 10 max health", () => {
      expect(GAME_CONFIG.PLAYER.MAX_HEALTH).toBe(10);
    });

    it("has reasonable movement speed", () => {
      expect(GAME_CONFIG.PLAYER.SPEED).toBeGreaterThan(0);
      expect(GAME_CONFIG.PLAYER.SPEED).toBeLessThan(500);
    });

    it("has dash faster than normal speed", () => {
      expect(GAME_CONFIG.PLAYER.DASH_SPEED).toBeGreaterThan(GAME_CONFIG.PLAYER.SPEED);
    });

    it("has dash cooldown longer than duration", () => {
      expect(GAME_CONFIG.PLAYER.DASH_COOLDOWN).toBeGreaterThan(GAME_CONFIG.PLAYER.DASH_DURATION);
    });

    it("has invincibility time after damage", () => {
      expect(GAME_CONFIG.PLAYER.INVINCIBILITY_TIME).toBeGreaterThan(0);
    });

    it("has 16x16 sprite size", () => {
      expect(GAME_CONFIG.PLAYER.SIZE).toBe(16);
    });
  });

  describe("Crimson Shot (weapon) settings", () => {
    it("has positive damage", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.DAMAGE).toBeGreaterThan(0);
    });

    it("has reasonable fire rate", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE).toBeGreaterThan(0);
      expect(GAME_CONFIG.CRIMSON_SHOT.FIRE_RATE).toBeLessThanOrEqual(10);
    });

    it("has projectile speed", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED).toBeGreaterThan(0);
    });

    it("has projectile lifetime", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME).toBeGreaterThan(0);
    });

    it("has projectile size", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SIZE).toBeGreaterThan(0);
    });
  });

  describe("Nightling enemy settings", () => {
    it("has positive health", () => {
      expect(GAME_CONFIG.NIGHTLING.HEALTH).toBeGreaterThan(0);
    });

    it("has movement speed slower than player", () => {
      expect(GAME_CONFIG.NIGHTLING.SPEED).toBeLessThan(GAME_CONFIG.PLAYER.SPEED);
    });

    it("has positive damage", () => {
      expect(GAME_CONFIG.NIGHTLING.DAMAGE).toBeGreaterThan(0);
    });

    it("has XP value", () => {
      expect(GAME_CONFIG.NIGHTLING.XP_VALUE).toBeGreaterThan(0);
    });

    it("has 16x16 sprite size", () => {
      expect(GAME_CONFIG.NIGHTLING.SIZE).toBe(16);
    });
  });

  describe("Spawn settings", () => {
    it("has base spawn rate", () => {
      expect(GAME_CONFIG.SPAWN.BASE_RATE).toBeGreaterThan(0);
    });

    it("has difficulty scaling", () => {
      expect(GAME_CONFIG.SPAWN.RATE_SCALE_PER_MINUTE).toBeGreaterThan(0);
    });

    it("spawns enemies off-screen", () => {
      expect(GAME_CONFIG.SPAWN.SPAWN_MARGIN).toBeGreaterThan(0);
    });
  });

  describe("XP & Leveling settings", () => {
    it("has orb size", () => {
      expect(GAME_CONFIG.XP.ORB_SIZE).toBeGreaterThan(0);
    });

    it("has magnet range for pickup", () => {
      expect(GAME_CONFIG.XP.MAGNET_RANGE).toBeGreaterThan(0);
    });

    it("has magnet speed", () => {
      expect(GAME_CONFIG.XP.MAGNET_SPEED).toBeGreaterThan(0);
    });

    it("has level thresholds array", () => {
      expect(Array.isArray(GAME_CONFIG.XP.LEVELS)).toBe(true);
      expect(GAME_CONFIG.XP.LEVELS.length).toBeGreaterThan(0);
    });

    it("has increasing level thresholds", () => {
      const levels = GAME_CONFIG.XP.LEVELS;
      for (let i = 1; i < levels.length; i++) {
        const current = levels[i];
        const prev = levels[i - 1];
        if (current !== undefined && prev !== undefined) {
          expect(current).toBeGreaterThan(prev);
        }
      }
    });
  });

  describe("Game rules", () => {
    it("has 3 minute survival time", () => {
      expect(GAME_CONFIG.SURVIVAL_TIME).toBe(180);
    });

    it("has projectile cap", () => {
      expect(GAME_CONFIG.MAX_PROJECTILES).toBeGreaterThan(0);
    });

    it("has enemy cap", () => {
      expect(GAME_CONFIG.MAX_ENEMIES).toBeGreaterThan(0);
    });

    it("allows more enemies than projectiles", () => {
      expect(GAME_CONFIG.MAX_ENEMIES).toBeGreaterThanOrEqual(GAME_CONFIG.MAX_PROJECTILES);
    });
  });

  describe("Game balance sanity checks", () => {
    it("player can kill enemies (damage > 0)", () => {
      expect(GAME_CONFIG.CRIMSON_SHOT.DAMAGE).toBeGreaterThanOrEqual(GAME_CONFIG.NIGHTLING.HEALTH);
    });

    it("player can survive some hits", () => {
      expect(GAME_CONFIG.PLAYER.MAX_HEALTH).toBeGreaterThanOrEqual(GAME_CONFIG.NIGHTLING.DAMAGE);
    });

    it("projectiles can reach half-screen (enemies come to player)", () => {
      const maxReach = GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_SPEED * GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME;
      const halfScreenDiagonal = Math.sqrt(GAME_CONFIG.WIDTH ** 2 + GAME_CONFIG.HEIGHT ** 2) / 2;
      expect(maxReach).toBeGreaterThan(halfScreenDiagonal);
    });
  });
});
