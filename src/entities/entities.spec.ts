// =============================================================================
// Entity Tests - Player, Enemy, Projectile, XPOrb
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { GAME_CONFIG } from "@game/GameConfig";
import { Player } from "@entities/Player";
import { Enemy } from "@entities/Enemy";
import { Projectile } from "@entities/Projectile";
import { XPOrb } from "@entities/XPOrb";

describe("Player", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  describe("constructor", () => {
    it("initializes with correct default state", () => {
      expect(player.state.health).toBe(GAME_CONFIG.PLAYER.MAX_HEALTH);
      expect(player.state.maxHealth).toBe(GAME_CONFIG.PLAYER.MAX_HEALTH);
      expect(player.state.active).toBe(true);
      expect(player.state.isDashing).toBe(false);
      expect(player.state.invincibilityTimer).toBe(0);
    });

    it("starts at center of screen", () => {
      expect(player.state.position.x).toBe(GAME_CONFIG.WIDTH / 2);
      expect(player.state.position.y).toBe(GAME_CONFIG.HEIGHT / 2);
    });

    it("creates container", () => {
      expect(player.container).toBeDefined();
    });
  });

  describe("update", () => {
    it("moves player based on input direction", () => {
      const startX = player.state.position.x;
      const startY = player.state.position.y;
      
      player.update(1, { x: 1, y: 0 }, false);
      
      expect(player.state.position.x).toBeGreaterThan(startX);
      expect(player.state.position.y).toBe(startY);
    });

    it("can move freely without bounds (infinite scrolling)", () => {
      const startX = player.state.position.x;
      
      // Move far left
      for (let i = 0; i < 100; i++) {
        player.update(0.1, { x: -1, y: 0 }, false);
      }
      
      // With infinite scrolling, player can move beyond original screen bounds
      expect(player.state.position.x).toBeLessThan(startX);
    });

    it("initiates dash when space pressed with movement", () => {
      player.update(0.016, { x: 1, y: 0 }, true);
      
      expect(player.state.isDashing).toBe(true);
      expect(player.state.dashCooldownTimer).toBeGreaterThan(0);
    });

    it("does not dash without movement direction", () => {
      player.update(0.016, { x: 0, y: 0 }, true);
      
      expect(player.state.isDashing).toBe(false);
    });

    it("decrements invincibility timer", () => {
      player.state.invincibilityTimer = 1.0;
      
      player.update(0.5, { x: 0, y: 0 }, false);
      
      expect(player.state.invincibilityTimer).toBe(0.5);
    });
  });

  describe("takeDamage", () => {
    it("reduces health by damage amount", () => {
      const initialHealth = player.state.health;
      
      player.takeDamage(1);
      
      expect(player.state.health).toBe(initialHealth - 1);
    });

    it("sets invincibility timer", () => {
      player.takeDamage(1);
      
      expect(player.state.invincibilityTimer).toBe(GAME_CONFIG.PLAYER.INVINCIBILITY_TIME);
    });

    it("returns false when player survives", () => {
      const died = player.takeDamage(1);
      
      expect(died).toBe(false);
      expect(player.state.active).toBe(true);
    });

    it("returns true and deactivates when health reaches 0", () => {
      player.state.health = 1;
      
      const died = player.takeDamage(1);
      
      expect(died).toBe(true);
      expect(player.state.health).toBe(0);
      expect(player.state.active).toBe(false);
    });

    it("ignores damage during invincibility", () => {
      player.state.invincibilityTimer = 1.0;
      const initialHealth = player.state.health;
      
      const damaged = player.takeDamage(1);
      
      expect(damaged).toBe(false);
      expect(player.state.health).toBe(initialHealth);
    });
  });

  describe("isInvincible", () => {
    it("returns true when timer is positive", () => {
      player.state.invincibilityTimer = 0.5;
      
      expect(player.isInvincible()).toBe(true);
    });

    it("returns false when timer is 0", () => {
      player.state.invincibilityTimer = 0;
      
      expect(player.isInvincible()).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      player.state.health = 5;
      player.state.position.x = 100;
      player.state.isDashing = true;
      player.state.active = false;
      
      player.reset();
      
      expect(player.state.health).toBe(GAME_CONFIG.PLAYER.MAX_HEALTH);
      expect(player.state.position.x).toBe(GAME_CONFIG.WIDTH / 2);
      expect(player.state.isDashing).toBe(false);
      expect(player.state.active).toBe(true);
    });
  });
});

describe("Enemy", () => {
  let enemy: Enemy;

  beforeEach(() => {
    enemy = new Enemy();
  });

  describe("constructor", () => {
    it("initializes inactive", () => {
      expect(enemy.state.active).toBe(false);
      expect(enemy.container.visible).toBe(false);
    });

    it("has correct stats from config", () => {
      expect(enemy.state.health).toBe(GAME_CONFIG.NIGHTLING.HEALTH);
      expect(enemy.state.damage).toBe(GAME_CONFIG.NIGHTLING.DAMAGE);
      expect(enemy.state.speed).toBe(GAME_CONFIG.NIGHTLING.SPEED);
      expect(enemy.state.xpValue).toBe(GAME_CONFIG.NIGHTLING.XP_VALUE);
    });
  });

  describe("activate", () => {
    it("sets position and activates", () => {
      enemy.activate(100, 200);
      
      expect(enemy.state.position.x).toBe(100);
      expect(enemy.state.position.y).toBe(200);
      expect(enemy.state.active).toBe(true);
      expect(enemy.container.visible).toBe(true);
    });

    it("resets health to max", () => {
      enemy.state.health = 0;
      
      enemy.activate(0, 0);
      
      expect(enemy.state.health).toBe(GAME_CONFIG.NIGHTLING.HEALTH);
    });
  });

  describe("deactivate", () => {
    it("deactivates and hides enemy", () => {
      enemy.activate(100, 100);
      
      enemy.deactivate();
      
      expect(enemy.state.active).toBe(false);
      expect(enemy.container.visible).toBe(false);
    });
  });

  describe("update", () => {
    it("does nothing when inactive", () => {
      const startX = enemy.state.position.x;
      
      enemy.update(1, { x: 0, y: 0 });
      
      expect(enemy.state.position.x).toBe(startX);
    });

    it("moves toward target when active", () => {
      enemy.activate(0, 0);
      
      enemy.update(1, { x: 100, y: 0 });
      
      expect(enemy.state.position.x).toBeGreaterThan(0);
    });
  });

  describe("takeDamage", () => {
    it("reduces health", () => {
      enemy.activate(0, 0);
      
      enemy.takeDamage(1);
      
      expect(enemy.state.health).toBe(GAME_CONFIG.NIGHTLING.HEALTH - 1);
    });

    it("returns true when killed", () => {
      enemy.activate(0, 0);
      enemy.state.health = 1;
      
      const killed = enemy.takeDamage(1);
      
      expect(killed).toBe(true);
      expect(enemy.state.active).toBe(false);
    });

    it("returns false when survives", () => {
      enemy.activate(0, 0);
      enemy.state.health = 5;
      
      const killed = enemy.takeDamage(1);
      
      expect(killed).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets state for pooling", () => {
      enemy.activate(100, 100);
      enemy.state.health = 0;
      
      enemy.reset();
      
      expect(enemy.state.active).toBe(false);
      expect(enemy.state.health).toBe(GAME_CONFIG.NIGHTLING.HEALTH);
      expect(enemy.container.visible).toBe(false);
    });
  });
});

describe("Projectile", () => {
  let projectile: Projectile;

  beforeEach(() => {
    projectile = new Projectile();
  });

  describe("constructor", () => {
    it("initializes inactive", () => {
      expect(projectile.state.active).toBe(false);
      expect(projectile.container.visible).toBe(false);
    });

    it("has correct damage from config", () => {
      expect(projectile.state.damage).toBe(GAME_CONFIG.CRIMSON_SHOT.DAMAGE);
    });
  });

  describe("activate", () => {
    it("sets position and velocity", () => {
      projectile.activate(100, 200, 50, 60, 5);
      
      expect(projectile.state.position.x).toBe(100);
      expect(projectile.state.position.y).toBe(200);
      expect(projectile.state.velocity.x).toBe(50);
      expect(projectile.state.velocity.y).toBe(60);
      expect(projectile.state.damage).toBe(5);
    });

    it("activates and shows projectile", () => {
      projectile.activate(0, 0, 1, 1, 1);
      
      expect(projectile.state.active).toBe(true);
      expect(projectile.container.visible).toBe(true);
    });

    it("resets lifetime", () => {
      projectile.activate(0, 0, 1, 1, 1);
      
      expect(projectile.state.lifetime).toBe(GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME);
    });
  });

  describe("deactivate", () => {
    it("deactivates and hides projectile", () => {
      projectile.activate(0, 0, 1, 1, 1);
      
      projectile.deactivate();
      
      expect(projectile.state.active).toBe(false);
      expect(projectile.container.visible).toBe(false);
    });
  });

  describe("update", () => {
    it("returns false when inactive", () => {
      const result = projectile.update(0.016);
      
      expect(result).toBe(false);
    });

    it("moves projectile by velocity", () => {
      projectile.activate(100, 100, 100, 50, 1);
      
      projectile.update(1);
      
      expect(projectile.state.position.x).toBe(200);
      expect(projectile.state.position.y).toBe(150);
    });

    it("decrements lifetime", () => {
      projectile.activate(100, 100, 0, 0, 1);
      const initialLifetime = projectile.state.lifetime;
      
      projectile.update(0.5);
      
      expect(projectile.state.lifetime).toBe(initialLifetime - 0.5);
    });

    it("deactivates when lifetime expires", () => {
      projectile.activate(100, 100, 0, 0, 1);
      
      projectile.update(GAME_CONFIG.CRIMSON_SHOT.PROJECTILE_LIFETIME + 0.1);
      
      expect(projectile.state.active).toBe(false);
    });

    it("remains active when moving far (infinite scrolling)", () => {
      projectile.activate(100, 100, 10000, 0, 1);
      
      projectile.update(0.1); // Move far right but short time
      
      // With infinite scrolling, projectiles don't die at screen edge
      expect(projectile.state.active).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets state for pooling", () => {
      projectile.activate(100, 100, 50, 50, 5);
      
      projectile.reset();
      
      expect(projectile.state.active).toBe(false);
      expect(projectile.state.lifetime).toBe(0);
      expect(projectile.container.visible).toBe(false);
    });
  });
});

describe("XPOrb", () => {
  let orb: XPOrb;

  beforeEach(() => {
    orb = new XPOrb();
  });

  describe("constructor", () => {
    it("initializes inactive", () => {
      expect(orb.state.active).toBe(false);
      expect(orb.container.visible).toBe(false);
    });

    it("has default value", () => {
      expect(orb.state.value).toBe(1);
    });
  });

  describe("activate", () => {
    it("sets position and value", () => {
      orb.activate(150, 250, 5);
      
      expect(orb.state.position.x).toBe(150);
      expect(orb.state.position.y).toBe(250);
      expect(orb.state.value).toBe(5);
    });

    it("activates and shows orb", () => {
      orb.activate(0, 0, 1);
      
      expect(orb.state.active).toBe(true);
      expect(orb.container.visible).toBe(true);
    });

    it("resets magnetized state", () => {
      orb.state.magnetized = true;
      
      orb.activate(0, 0, 1);
      
      expect(orb.state.magnetized).toBe(false);
    });
  });

  describe("deactivate", () => {
    it("deactivates and hides orb", () => {
      orb.activate(0, 0, 1);
      
      orb.deactivate();
      
      expect(orb.state.active).toBe(false);
      expect(orb.container.visible).toBe(false);
    });
  });

  describe("update", () => {
    it("returns false when inactive", () => {
      const result = orb.update(0.016, { x: 0, y: 0 });
      
      expect(result).toBe(false);
    });

    it("magnetizes when player is close", () => {
      orb.activate(100, 100, 1);
      
      // Player at position within magnet range
      orb.update(0.016, { x: 100 + GAME_CONFIG.XP.MAGNET_RANGE - 10, y: 100 });
      
      expect(orb.state.magnetized).toBe(true);
    });

    it("moves toward player when magnetized", () => {
      orb.activate(100, 100, 1);
      orb.state.magnetized = true;
      
      const startX = orb.state.position.x;
      orb.update(0.1, { x: 200, y: 100 });
      
      expect(orb.state.position.x).toBeGreaterThan(startX);
    });

    it("returns true when collected (very close to player)", () => {
      orb.activate(105, 100, 1);
      orb.state.magnetized = true;
      
      // Move orb very close to player
      orb.state.position.x = 101;
      orb.state.position.y = 100;
      
      const collected = orb.update(0.016, { x: 100, y: 100 });
      
      expect(collected).toBe(true);
    });
  });

  describe("reset", () => {
    it("resets state for pooling", () => {
      orb.activate(100, 100, 5);
      orb.state.magnetized = true;
      
      orb.reset();
      
      expect(orb.state.active).toBe(false);
      expect(orb.state.magnetized).toBe(false);
      expect(orb.container.visible).toBe(false);
    });
  });
});
