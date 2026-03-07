// =============================================================================
// Boss HP Bar UI
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";

export class BossHPBar {
  public container: Container;
  private background: Graphics;
  private healthBar: Graphics;
  private border: Graphics;
  private nameText: Text;
  private hpText: Text;

  constructor() {
    this.container = new Container();
    this.container.x = GAME_CONFIG.WIDTH / 2;
    this.container.y = 20;
    this.container.visible = false;

    const barWidth = 300;
    const barHeight = 20;

    // Background (dark)
    this.background = new Graphics();
    this.background.rect(-barWidth / 2, 0, barWidth, barHeight);
    this.background.fill(0x220000);
    this.container.addChild(this.background);

    // Health bar (red)
    this.healthBar = new Graphics();
    this.container.addChild(this.healthBar);

    // Border
    this.border = new Graphics();
    this.border.rect(-barWidth / 2, 0, barWidth, barHeight);
    this.border.stroke({ color: 0xFFD700, width: 2 }); // Gold border
    this.container.addChild(this.border);

    // Boss name
    const nameStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xFFD700,
      fontWeight: "bold",
    });
    this.nameText = new Text({ text: "BOSS", style: nameStyle });
    this.nameText.anchor.set(0.5, 1);
    this.nameText.x = 0;
    this.nameText.y = -4;
    this.container.addChild(this.nameText);

    // HP text
    const hpStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xFFFFFF,
      fontWeight: "bold",
    });
    this.hpText = new Text({ text: "100/100", style: hpStyle });
    this.hpText.anchor.set(0.5);
    this.hpText.x = 0;
    this.hpText.y = barHeight / 2;
    this.container.addChild(this.hpText);
  }

  /** Show boss HP bar */
  show(): void {
    this.container.visible = true;
  }

  /** Hide boss HP bar */
  hide(): void {
    this.container.visible = false;
  }

  /** Update boss HP bar */
  update(currentHP: number, maxHP: number): void {
    const barWidth = 300;
    const barHeight = 20;
    const healthPercent = Math.max(0, currentHP / maxHP);

    // Redraw health bar
    this.healthBar.clear();
    this.healthBar.rect(-barWidth / 2, 0, barWidth * healthPercent, barHeight);
    this.healthBar.fill(0xFF0000); // Red

    // Update HP text
    this.hpText.text = `${Math.ceil(currentHP)}/${maxHP}`;
  }
}
