// =============================================================================
// Crimson Echoes - Main Entry Point
// =============================================================================

import { Application, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Game } from "@game/Game";
import { loadAssets } from "@utils/assets";

async function main(): Promise<void> {
  console.log("Crimson Echoes - Starting...");

  // Create PixiJS application
  const app = new Application();

  await app.init({
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    backgroundColor: GAME_CONFIG.BACKGROUND_COLOR,
    resolution: GAME_CONFIG.SCALE,
    autoDensity: true,
    antialias: false, // Pixel art needs crisp edges
  });

  // Add canvas to page
  const container = document.getElementById("game-container");
  if (!container) {
    throw new Error("Game container not found");
  }
  container.appendChild(app.canvas);

  // Style canvas for pixel-perfect scaling
  app.canvas.style.width = `${GAME_CONFIG.WIDTH * GAME_CONFIG.SCALE}px`;
  app.canvas.style.height = `${GAME_CONFIG.HEIGHT * GAME_CONFIG.SCALE}px`;
  app.canvas.style.imageRendering = "pixelated";

  // Load all game assets before creating entities
  console.log("Loading assets...");
  await loadAssets();
  console.log("Assets loaded!");

  // Create background
  const background = new Graphics();
  background.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
  background.fill(GAME_CONFIG.BACKGROUND_COLOR);
  app.stage.addChild(background);

  // Add arena floor pattern
  const floor = new Graphics();
  const tileSize = 32;
  for (let x = 0; x < GAME_CONFIG.WIDTH; x += tileSize) {
    for (let y = 0; y < GAME_CONFIG.HEIGHT; y += tileSize) {
      const shade = (x + y) % (tileSize * 2) === 0 ? 0x16162a : 0x1a1a2e;
      floor.rect(x, y, tileSize, tileSize);
      floor.fill(shade);
    }
  }
  app.stage.addChild(floor);

  // Create game (after assets are loaded)
  const game = new Game();
  app.stage.addChild(game.container);

  // Game loop
  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime / 60; // Convert to seconds (assuming 60 FPS base)
    game.update(dt);
  });

  console.log("Crimson Echoes - Running!");
  console.log(`Canvas: ${GAME_CONFIG.WIDTH}x${GAME_CONFIG.HEIGHT} @ ${GAME_CONFIG.SCALE}x scale`);
  console.log("Controls: WASD to move, SPACE to dash");
}

// Start the game
main().catch(console.error);
