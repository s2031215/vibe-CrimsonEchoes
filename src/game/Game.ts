// =============================================================================
// Main Game Class
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Player } from "@entities/Player";
import { InputSystem } from "@systems/InputSystem";
import { EchoSystem } from "@systems/EchoSystem";
import { SpawnSystem } from "@systems/SpawnSystem";
import { XPSystem } from "@systems/XPSystem";
import { CollisionSystem } from "@systems/CollisionSystem";
import { HealthBar } from "@ui/HealthBar";
import { Timer } from "@ui/Timer";
import { XPBar } from "@ui/XPBar";
import { BossHPBar } from "@ui/BossHPBar";
import { GameOverScreen } from "@ui/GameOverScreen";
import { LevelUpScreen } from "@ui/LevelUpScreen";
import { getRandomUpgrades } from "@game/Upgrades";
import type { GameState } from "@/types";

export class Game {
  // Containers
  public container: Container;
  private backgroundContainer: Container;
  private gameContainer: Container;
  private uiContainer: Container;

  // Core
  private state: GameState = "playing";
  private elapsedTime: number = 0;
  private remainingTime: number;
  private backgroundGraphics!: Graphics;
  private boundaryGraphics!: Graphics;

  // Systems
  private inputSystem: InputSystem;
  private echoSystem: EchoSystem;
  private spawnSystem: SpawnSystem;
  private xpSystem: XPSystem;
  private collisionSystem: CollisionSystem;

  // Entities
  private player: Player;

  // Progression tracking
  private acquiredUpgradeIds: Set<string> = new Set();
  private weaponTiers: Map<string, number> = new Map(); // Track weapon tier levels (1, 2, 3)

  // UI
  private healthBar: HealthBar;
  private timer: Timer;
  private xpBar: XPBar;
  private bossHPBar: BossHPBar;
  private gameOverScreen: GameOverScreen;
  private levelUpScreen: LevelUpScreen;

  // Screen shake
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;

  constructor() {
    this.container = new Container();
    this.backgroundContainer = new Container();
    this.gameContainer = new Container();
    this.uiContainer = new Container();

    this.container.addChild(this.backgroundContainer);
    this.container.addChild(this.gameContainer);
    this.container.addChild(this.uiContainer);

    this.remainingTime = GAME_CONFIG.SURVIVAL_TIME;

    // Create tiled background
    this.createBackground();

    // Initialize systems
    this.inputSystem = new InputSystem();
    this.collisionSystem = new CollisionSystem(this.gameContainer);

    // Initialize player
    this.player = new Player();
    this.gameContainer.addChild(this.player.container);

    // Initialize game systems (order matters for rendering)
    this.xpSystem = new XPSystem(this.gameContainer);
    this.spawnSystem = new SpawnSystem(this.gameContainer);
    this.echoSystem = new EchoSystem(this.gameContainer);

    // Initialize UI
    this.healthBar = new HealthBar();
    this.timer = new Timer();
    this.xpBar = new XPBar();
    this.bossHPBar = new BossHPBar();
    this.gameOverScreen = new GameOverScreen();
    this.levelUpScreen = new LevelUpScreen();

    this.uiContainer.addChild(this.healthBar.container);
    this.uiContainer.addChild(this.timer.container);
    this.uiContainer.addChild(this.xpBar.container);
    this.uiContainer.addChild(this.bossHPBar.container);
    this.uiContainer.addChild(this.gameOverScreen.container);
    this.uiContainer.addChild(this.levelUpScreen.container);

    // Keyboard support for level up screen
    window.addEventListener("keydown", (e) => {
      if (this.state === "levelup") {
        this.levelUpScreen.handleInput(e.key);
      }
    });
  }

  /** Create static background (1000x1000 map with 800x800 red boundary) */
  private createBackground(): void {
    const tileSize = 32;
    const mapWidth = GAME_CONFIG.MAP_WIDTH;
    const mapHeight = GAME_CONFIG.MAP_HEIGHT;

    // Create a graphics object for the static map
    this.backgroundGraphics = new Graphics();

    // Draw tiled pattern across the entire map
    for (let x = 0; x < mapWidth; x += tileSize) {
      for (let y = 0; y < mapHeight; y += tileSize) {
        // Base color (dark slate/purple)
        this.backgroundGraphics.rect(x, y, tileSize, tileSize);
        this.backgroundGraphics.fill('#1e1e24');

        // Grid lines
        this.backgroundGraphics.rect(x, y, tileSize, 2);
        this.backgroundGraphics.fill('#2a2a35');
        this.backgroundGraphics.rect(x, y, 2, tileSize);
        this.backgroundGraphics.fill('#2a2a35');

        // Detail dot
        this.backgroundGraphics.rect(x + tileSize - 4, y + tileSize - 4, 2, 2);
        this.backgroundGraphics.fill('#111116');
      }
    }

    this.backgroundContainer.addChild(this.backgroundGraphics);

    // Create red boundary in gameContainer (so it moves with the world)
    this.boundaryGraphics = new Graphics();
    const boundaryMargin = 100;
    this.boundaryGraphics.rect(
      boundaryMargin, 
      boundaryMargin, 
      800, 
      800
    );
    this.boundaryGraphics.stroke({ color: 0xFF0000, width: 4 });

    // Add boundary to gameContainer so it moves with camera
    this.gameContainer.addChild(this.boundaryGraphics);
  }

  /** Main update loop */
  update(dt: number): void {
    // Update input
    this.inputSystem.update();

    // Handle game state
    switch (this.state) {
      case "playing":
        this.updatePlaying(dt);
        break;
      case "levelup":
        this.updateLevelUp();
        break;
      case "gameover":
      case "victory":
        this.updateGameOver();
        break;
    }

    // Update screen shake
    this.updateScreenShake(dt);
  }

  /** Update gameplay */
  private updatePlaying(dt: number): void {
    // Update timers
    this.elapsedTime += dt;
    this.remainingTime -= dt;

    // Victory condition: Kill the final boss (5min boss, type 2), not time limit
    // Time still counts down to show progression, but game only ends when boss dies
    if (this.remainingTime <= 0) {
      this.remainingTime = 0;
      // Don't auto-victory, must kill the boss
    }

    // Get input
    const moveDir = this.inputSystem.getMovementDirection();
    const input = this.inputSystem.getState();

    // Cheat: Press U to instantly level up
    if (input.levelUpCheatPressed) {
      const currentState = this.xpSystem.getState();
      const xpNeeded = currentState.xpToNextLevel - currentState.xp;
      this.xpSystem.addXP(xpNeeded);
    }

    // Update player
    this.player.update(dt, moveDir, input.dashPressed);

    // Update systems
    const enemies = this.spawnSystem.getActiveEnemies();

    this.spawnSystem.update(dt, this.elapsedTime, this.player.state.position);

    // Update all enemies
    for (const enemy of enemies) {
      enemy.update(dt, this.player.state.position);
    }

    // Update boss
    const boss = this.spawnSystem.getActiveBoss();
    if (boss && boss.state.active) {
      // Wire up boss attack callbacks (if not already set)
      if (!boss.onSpawnProjectile) {
        boss.onSpawnProjectile = (x, y, vx, vy, damage) => {
          this.spawnSystem.spawnBossProjectile(x, y, vx, vy, damage);
        };
        boss.onSpawnLaserWarning = (from, to, duration) => {
          this.spawnSystem.spawnLaserWarning(from, to, duration);
        };
        boss.onSpawnLaserBeam = (from, to, damage) => {
          this.spawnSystem.spawnLaserBeam(from, to, damage);
        };
      }
      
      boss.update(dt, this.player.state.position);
    }

    // Update boss attacks (projectiles, warnings, beams)
    this.spawnSystem.updateBossAttacks(dt);

    this.echoSystem.update(dt, this.player.state.position, enemies, boss);
    this.xpSystem.update(dt, this.player.state.position);

    // Check collisions
    const collisionResult = this.collisionSystem.checkCollisions(
      this.player,
      this.echoSystem,
      this.spawnSystem,
      this.xpSystem
    );

    // Separate overlapping enemies
    this.collisionSystem.separateEnemies(this.spawnSystem);

    // Update explosion animations
    this.collisionSystem.updateExplosions(dt);
    
    // Update lightning link animations
    this.collisionSystem.updateLightningLinks(dt);

    // Handle collision results
    if (collisionResult.playerHit) {
      this.triggerScreenShake(5, 0.2);
    }

    if (collisionResult.playerDied) {
      this.gameOver();
      return;
    }

    // Victory condition: Final boss (type 2) killed
    if (collisionResult.finalBossKilled) {
      this.victory();
      return;
    }

    // Update camera (center on player, but constrain to map bounds)
    const halfWidth = GAME_CONFIG.WIDTH / 2;
    const halfHeight = GAME_CONFIG.HEIGHT / 2;
    const mapWidth = GAME_CONFIG.MAP_WIDTH;
    const mapHeight = GAME_CONFIG.MAP_HEIGHT;
    
    let cameraX = halfWidth - this.player.state.position.x;
    let cameraY = halfHeight - this.player.state.position.y;
    
    // Constrain camera to map bounds
    cameraX = Math.min(0, Math.max(cameraX, GAME_CONFIG.WIDTH - mapWidth));
    cameraY = Math.min(0, Math.max(cameraY, GAME_CONFIG.HEIGHT - mapHeight));
    
    // Move background with camera
    this.backgroundContainer.x = cameraX;
    this.backgroundContainer.y = cameraY;

    // Update UI
    this.healthBar.update(this.player.state.health);
    this.timer.update(this.remainingTime);
    this.xpBar.update(this.xpSystem.getState(), this.xpSystem.getProgress());

    // Update boss HP bar
    const activeBoss = this.spawnSystem.getActiveBoss();
    if (activeBoss && activeBoss.state.active) {
      this.bossHPBar.show();
      this.bossHPBar.update(activeBoss.state.health, activeBoss.state.maxHealth);
    } else {
      this.bossHPBar.hide();
    }

    // Check for level up
    if (this.xpSystem.consumeLevelUp()) {
      this.triggerLevelUp();
    }
  }

  /** Trigger level up sequence */
  private triggerLevelUp(): void {
    this.state = "levelup";
    
    // Get current player level
    const currentLevel = this.xpSystem.getState().level;
    
    // Get 3 random upgrades from the upgrade pool (filtered by level and acquired upgrades)
    const choices = getRandomUpgrades(3, currentLevel, this.acquiredUpgradeIds, this.weaponTiers);

    this.levelUpScreen.show(choices, (selectedUpgrade) => {
      // Add selected upgrade to acquired set (only for weapon upgrades, not stat/heal)
      // Stat and heal upgrades can be taken multiple times
      if (selectedUpgrade.type === "weapon") {
        this.acquiredUpgradeIds.add(selectedUpgrade.id);
      }
      
      // Apply the upgrade
      selectedUpgrade.apply(this);
      this.levelUpScreen.hide();
      this.state = "playing";
    });
  }

  /** Update level up state */
  private updateLevelUp(): void {
    // Only check keyboard numbers 1, 2, 3
    // Pixi doesn't have a built-in keyboard state for individual keys easily in our simple input system,
    // so we handle it by directly binding or checking the keys.
    // For now, the LevelUpScreen's pointerdown handles mouse clicks.
    // Let's add basic key polling if needed, or rely on mouse.
    
    // We can use a simple global event listener for 1/2/3 while in levelup state
  }

  /** Update game over state */
  private updateGameOver(): void {
    const input = this.inputSystem.getState();

    if (input.dashPressed) {
      this.restart();
    }
  }

  /** Trigger screen shake */
  private triggerScreenShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /** Update screen shake effect */
  private updateScreenShake(dt: number): void {
    const halfWidth = GAME_CONFIG.WIDTH / 2;
    const halfHeight = GAME_CONFIG.HEIGHT / 2;
    const mapWidth = GAME_CONFIG.MAP_WIDTH;
    const mapHeight = GAME_CONFIG.MAP_HEIGHT;
    
    let cameraX = halfWidth - this.player.state.position.x;
    let cameraY = halfHeight - this.player.state.position.y;
    
    // Constrain camera to map bounds
    cameraX = Math.min(0, Math.max(cameraX, GAME_CONFIG.WIDTH - mapWidth));
    cameraY = Math.min(0, Math.max(cameraY, GAME_CONFIG.HEIGHT - mapHeight));

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const shake = this.shakeIntensity * (this.shakeDuration > 0 ? 1 : 0);
      this.gameContainer.x = cameraX + (Math.random() - 0.5) * shake * 2;
      this.gameContainer.y = cameraY + (Math.random() - 0.5) * shake * 2;
    } else {
      this.gameContainer.x = cameraX;
      this.gameContainer.y = cameraY;
    }
  }

  /** Handle game over */
  private gameOver(): void {
    this.state = "gameover";
    this.gameOverScreen.show(false, this.elapsedTime, this.xpSystem.getState().level);
  }

  /** Handle victory */
  private victory(): void {
    this.state = "victory";
    this.gameOverScreen.show(true, this.elapsedTime, this.xpSystem.getState().level);
  }

  /** Restart game */
  private restart(): void {
    this.state = "playing";
    this.elapsedTime = 0;
    this.remainingTime = GAME_CONFIG.SURVIVAL_TIME;

    // Clear acquired upgrades and weapon tiers for new run
    this.acquiredUpgradeIds.clear();
    this.weaponTiers.clear();

    this.player.reset();
    this.echoSystem.reset();
    this.spawnSystem.reset();
    this.xpSystem.reset();

    this.gameOverScreen.hide();
  }
}
