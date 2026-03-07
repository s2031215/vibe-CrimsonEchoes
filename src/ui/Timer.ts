// =============================================================================
// Timer UI
// =============================================================================

import { Container, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";

export class Timer {
  public container: Container;
  private text: Text;

  constructor() {
    this.container = new Container();

    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fill: 0xffffff,
      align: "center",
    });

    this.text = new Text({ text: "3:00", style });
    this.text.anchor.set(0.5, 0);
    this.text.x = GAME_CONFIG.WIDTH / 2;
    this.text.y = 8;

    this.container.addChild(this.text);
  }

  /** Update timer display */
  update(remainingSeconds: number): void {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    this.text.text = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Flash red when low
    if (remainingSeconds <= 30) {
      this.text.style.fill = remainingSeconds % 1 < 0.5 ? 0xef4444 : 0xffffff;
    } else {
      this.text.style.fill = 0xffffff;
    }
  }
}
