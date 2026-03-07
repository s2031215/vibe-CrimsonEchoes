// =============================================================================
// XP Bar UI
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { ProgressionState } from "@/types";

export class XPBar {
  public container: Container;
  private background: Graphics;
  private fill: Graphics;
  private levelText: Text;

  private barWidth: number;
  private barHeight: number = 8;

  constructor() {
    this.container = new Container();
    this.barWidth = GAME_CONFIG.WIDTH - 100;

    // Background bar
    this.background = new Graphics();
    this.background.rect(0, 0, this.barWidth, this.barHeight);
    this.background.fill(0x374151);
    this.background.x = 50;
    this.background.y = GAME_CONFIG.HEIGHT - 16;

    // Fill bar
    this.fill = new Graphics();
    this.fill.rect(0, 0, this.barWidth, this.barHeight);
    this.fill.fill(0x22c55e);
    this.fill.x = 50;
    this.fill.y = GAME_CONFIG.HEIGHT - 16;
    this.fill.scale.x = 0;

    // Level text
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xffffff,
    });

    this.levelText = new Text({ text: "Lv.1", style });
    this.levelText.anchor.set(0, 0.5);
    this.levelText.x = 8;
    this.levelText.y = GAME_CONFIG.HEIGHT - 12;

    this.container.addChild(this.background);
    this.container.addChild(this.fill);
    this.container.addChild(this.levelText);
  }

  /** Update XP bar display */
  update(state: ProgressionState, progress: number): void {
    // Update fill
    this.fill.scale.x = Math.max(0, Math.min(1, progress));

    // Update level text
    this.levelText.text = `Lv.${state.level}`;
  }
}
