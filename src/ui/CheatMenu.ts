// =============================================================================
// CheatMenu - Dev-only UI for testing weapon upgrades
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { WEAPON_TIER_UPGRADES } from "@game/Upgrades";
import type { Game } from "@game/Game";

export class CheatMenu {
  public container: Container;
  private game: Game | null = null;
  private weaponButtons: Container[] = [];

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.container.zIndex = 10000; // Always on top

    // Semi-transparent dark overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    overlay.eventMode = "static"; // Block clicks beneath
    this.container.addChild(overlay);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 20,
      fill: 0xff00ff, // Magenta for dev tool
      fontWeight: "bold",
      align: "center",
    });
    const titleText = new Text({ text: "[CHEAT MENU - DEV ONLY]", style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.x = GAME_CONFIG.WIDTH / 2;
    titleText.y = 15;
    this.container.addChild(titleText);

    // Instructions
    const instructStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xaaaaaa,
      align: "center",
    });
    const instructText = new Text({
      text: "Press C to close | Click weapon to upgrade tier",
      style: instructStyle,
    });
    instructText.anchor.set(0.5);
    instructText.x = GAME_CONFIG.WIDTH / 2;
    instructText.y = 35;
    this.container.addChild(instructText);

    this.createWeaponButtons();
  }

  /** Create weapon upgrade buttons */
  private createWeaponButtons(): void {
    const weapons = [
      { id: "shotgun", name: "Shotgun" },
      { id: "piercing_rounds", name: "Piercing Rounds" },
      { id: "split_shot", name: "Split Shot" },
      { id: "chain_lightning", name: "Chain Lightning" },
      { id: "explosive_rounds", name: "Explosive Rounds" },
      { id: "homing_missiles", name: "Homing Missiles" },
      { id: "directional_shot", name: "Directional Shot" },
    ];

    const startY = 60;
    const spacingY = 26;
    const buttonWidth = 380;
    const buttonHeight = 22;

    weapons.forEach((weapon, index) => {
      const button = new Container();
      button.x = GAME_CONFIG.WIDTH / 2 - buttonWidth / 2;
      button.y = startY + index * spacingY;

      // Background
      const bg = new Graphics();
      bg.rect(0, 0, buttonWidth, buttonHeight);
      bg.fill({ color: 0x1a1a2e });
      bg.stroke({ color: 0x444466, width: 1 });
      button.addChild(bg);

      // Weapon name
      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: "bold",
      });
      const nameText = new Text({ text: weapon.name, style: nameStyle });
      nameText.x = 5;
      nameText.y = 5;
      button.addChild(nameText);

      // Tier indicator (updated dynamically)
      const tierStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 11,
        fill: 0xaaaaaa,
      });
      const tierText = new Text({ text: "Tier: 0", style: tierStyle });
      tierText.x = buttonWidth - 60;
      tierText.y = 5;
      button.addChild(tierText);

      // Make interactive
      button.eventMode = "static";
      button.cursor = "pointer";

      button.on("pointerover", () => {
        bg.clear();
        bg.rect(0, 0, buttonWidth, buttonHeight);
        bg.fill({ color: 0x2a2a3e });
        bg.stroke({ color: 0xffaa00, width: 2 });
      });

      button.on("pointerout", () => {
        bg.clear();
        bg.rect(0, 0, buttonWidth, buttonHeight);
        bg.fill({ color: 0x1a1a2e });
        bg.stroke({ color: 0x444466, width: 1 });
      });

      button.on("pointerdown", () => {
        this.upgradeWeapon(weapon.id);
      });

      // Store reference for updates
      (button as Container & { weaponId: string; tierText: Text }).weaponId = weapon.id;
      (button as Container & { weaponId: string; tierText: Text }).tierText = tierText;

      this.weaponButtons.push(button);
      this.container.addChild(button);
    });
  }

  /** Upgrade weapon to next tier */
  private upgradeWeapon(weaponId: string): void {
    if (!this.game) return;

    const currentTier = this.game["weaponTiers"].get(weaponId) || 0;
    const nextTier = Math.min(currentTier + 1, 3);

    if (nextTier === currentTier) return; // Already max tier

    const tiers = WEAPON_TIER_UPGRADES.get(weaponId);
    if (!tiers) return;

    const upgrade = tiers[nextTier - 1]; // tiers array is 0-indexed
    if (!upgrade) return;

    // Apply upgrade
    upgrade.apply(this.game);

    // Update tier display
    this.updateTierDisplays();
  }

  /** Update all tier displays */
  private updateTierDisplays(): void {
    if (!this.game) return;

    for (const button of this.weaponButtons) {
      const weaponId = (button as Container & { weaponId: string }).weaponId;
      const tierText = (button as Container & { tierText: Text }).tierText;
      const currentTier = this.game["weaponTiers"].get(weaponId) || 0;

      tierText.text = `Tier: ${currentTier}`;

      // Color tier text based on tier level
      if (currentTier === 0) {
        tierText.style.fill = 0x666666;
      } else if (currentTier === 1) {
        tierText.style.fill = 0x00ff00; // Green
      } else if (currentTier === 2) {
        tierText.style.fill = 0x00aaff; // Blue
      } else if (currentTier === 3) {
        tierText.style.fill = 0xff00ff; // Magenta
      }
    }
  }

  /** Toggle visibility */
  toggle(game: Game): void {
    this.container.visible = !this.container.visible;
    this.game = game;

    if (this.container.visible) {
      this.updateTierDisplays();
    }
  }

  /** Show menu */
  show(game: Game): void {
    this.container.visible = true;
    this.game = game;
    this.updateTierDisplays();
  }

  /** Hide menu */
  hide(): void {
    this.container.visible = false;
    this.game = null;
  }

  /** Check if menu is open */
  isVisible(): boolean {
    return this.container.visible;
  }
}
