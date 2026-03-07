import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { Upgrade } from "@/types";

export class LevelUpScreen {
  public container: Container;
  private onSelectCallback: ((upgrade: Upgrade) => void) | null = null;
  private choiceContainers: Container[] = [];
  private currentOptions: Upgrade[] = [];

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Dim overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.8 });
    
    // Make overlay interactive to block clicks beneath it
    overlay.eventMode = "static";
    this.container.addChild(overlay);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 24,
      fill: 0xffd700,
      align: "center",
      dropShadow: {
        color: 0x000000,
        distance: 2,
        alpha: 1,
      },
    });
    
    const titleText = new Text({ text: "LEVEL UP!", style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.x = GAME_CONFIG.WIDTH / 2;
    titleText.y = 40;
    this.container.addChild(titleText);
  }

  /** Show level up screen with choices */
  show(options: Upgrade[], onSelect: (upgrade: Upgrade) => void): void {
    this.container.visible = true;
    this.onSelectCallback = onSelect;
    this.currentOptions = options;

    this.clearChoices();

    const startY = 90;
    const spacingY = 55;

    options.forEach((upgrade, index) => {
      const choiceContainer = this.createChoiceCard(upgrade, index, startY + index * spacingY);
      this.choiceContainers.push(choiceContainer);
      this.container.addChild(choiceContainer);
    });
  }

  private createChoiceCard(upgrade: Upgrade, index: number, yPos: number): Container {
    const card = new Container();
    card.x = GAME_CONFIG.WIDTH / 2 - 150;
    card.y = yPos;
    
    // Background
    const bg = new Graphics();
    bg.rect(0, 0, 300, 45);
    bg.fill({ color: 0x1f2937 });
    bg.stroke({ color: 0x4b5563, width: 2 });
    card.addChild(bg);

    // Interactive
    card.eventMode = "static";
    card.cursor = "pointer";
    
    // Hover effects
    card.on('pointerover', () => {
      bg.clear();
      bg.rect(0, 0, 300, 45);
      bg.fill({ color: 0x374151 });
      bg.stroke({ color: 0xfacc15, width: 2 });
    });
    
    card.on('pointerout', () => {
      bg.clear();
      bg.rect(0, 0, 300, 45);
      bg.fill({ color: 0x1f2937 });
      bg.stroke({ color: 0x4b5563, width: 2 });
    });

    card.on('pointerdown', () => {
      if (this.onSelectCallback) {
        this.onSelectCallback(upgrade);
      }
    });

    // Option Number (1, 2, 3)
    const numStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fill: 0x9ca3af,
    });
    const numText = new Text({ text: `${index + 1}.`, style: numStyle });
    numText.x = 10;
    numText.y = 12;
    card.addChild(numText);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fill: upgrade.type === "weapon" ? 0xef4444 : 0x3b82f6,
      fontWeight: "bold"
    });
    const titleText = new Text({ text: upgrade.name, style: titleStyle });
    titleText.x = 35;
    titleText.y = 5;
    card.addChild(titleText);

    // Description
    const descStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xd1d5db,
    });
    const descText = new Text({ text: upgrade.description, style: descStyle });
    descText.x = 35;
    descText.y = 25;
    card.addChild(descText);

    return card;
  }

  /** Hide screen */
  hide(): void {
    this.container.visible = false;
    this.clearChoices();
    this.onSelectCallback = null;
    this.currentOptions = [];
  }

  private clearChoices(): void {
    for (const card of this.choiceContainers) {
      card.destroy();
    }
    this.choiceContainers = [];
  }

  /** Check if a number key was pressed to select an option */
  handleInput(key: string): boolean {
    if (!this.container.visible) return false;
    
    if (key === "1" && this.currentOptions.length >= 1) {
      this.onSelectCallback?.(this.currentOptions[0] as Upgrade);
      return true;
    }
    if (key === "2" && this.currentOptions.length >= 2) {
      this.onSelectCallback?.(this.currentOptions[1] as Upgrade);
      return true;
    }
    if (key === "3" && this.currentOptions.length >= 3) {
      this.onSelectCallback?.(this.currentOptions[2] as Upgrade);
      return true;
    }
    
    return false;
  }
}
