// =============================================================================
// Game Over Screen UI
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";

export class GameOverScreen {
  public container: Container;
  private titleText: Text;
  private subtitleText: Text;
  private restartText: Text;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Dim overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.container.addChild(overlay);

    // Title style
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 32,
      fill: 0xffffff,
      align: "center",
    });

    // Subtitle style
    const subtitleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fill: 0x9ca3af,
      align: "center",
    });

    // Restart style
    const restartStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0x22c55e,
      align: "center",
    });

    // Title
    this.titleText = new Text({ text: "GAME OVER", style: titleStyle });
    this.titleText.anchor.set(0.5);
    this.titleText.x = GAME_CONFIG.WIDTH / 2;
    this.titleText.y = GAME_CONFIG.HEIGHT / 2 - 30;

    // Subtitle
    this.subtitleText = new Text({ text: "Time: 0:00 | Level: 1", style: subtitleStyle });
    this.subtitleText.anchor.set(0.5);
    this.subtitleText.x = GAME_CONFIG.WIDTH / 2;
    this.subtitleText.y = GAME_CONFIG.HEIGHT / 2 + 10;

    // Restart prompt
    this.restartText = new Text({ text: "Press SPACE to restart", style: restartStyle });
    this.restartText.anchor.set(0.5);
    this.restartText.x = GAME_CONFIG.WIDTH / 2;
    this.restartText.y = GAME_CONFIG.HEIGHT / 2 + 50;

    this.container.addChild(this.titleText);
    this.container.addChild(this.subtitleText);
    this.container.addChild(this.restartText);
  }

  /** Show game over screen */
  show(victory: boolean, time: number, level: number): void {
    this.container.visible = true;

    if (victory) {
      this.titleText.text = "YOU SURVIVED!";
      this.titleText.style.fill = 0x22c55e;
    } else {
      this.titleText.text = "GAME OVER";
      this.titleText.style.fill = 0xef4444;
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    this.subtitleText.text = `Time: ${minutes}:${seconds.toString().padStart(2, "0")} | Level: ${level}`;
  }

  /** Hide screen */
  hide(): void {
    this.container.visible = false;
  }
}
