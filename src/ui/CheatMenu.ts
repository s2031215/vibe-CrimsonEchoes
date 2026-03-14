// =============================================================================
// CheatMenu - Dev-only UI for testing weapon upgrades
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { WEAPON_TIER_UPGRADES } from "@game/Upgrades";
import type { Game } from "@game/Game";

/** Default (zeroed-out) weapon stats to restore when resetting a weapon to T0 */
const WEAPON_RESET_STATS: Record<string, (game: Game) => void> = {
  shotgun: (game: Game) => {
    game["echoSystem"].weaponStats.shotgunCount = 0;
    game["echoSystem"].weaponStats.shotgunLineWaveMode = false;
    game["echoSystem"].weaponStats.shotgunWaveHoming = false;
    game["echoSystem"].crimsonWaveFireCooldown = 0;
  },
  piercing_rounds: (game: Game) => {
    game["echoSystem"].weaponStats.pierceCount = 0;
    game["echoSystem"].weaponStats.piercingSizeBoost = 1.0;
    game["echoSystem"].weaponStats.piercingSpeedPenalty = 1.0;
    game["echoSystem"].weaponStats.piercingLaserMode = false;
  },
  split_shot: (game: Game) => {
    game["echoSystem"].weaponStats.splitOnHit = false;
    game["echoSystem"].weaponStats.splitCount = 0;
  },
  chain_lightning: (game: Game) => {
    game["echoSystem"].weaponStats.chainCount = 0;
    game["echoSystem"].weaponStats.chainDragonMode = false;
  },
  explosive_rounds: (game: Game) => {
    game["echoSystem"].weaponStats.explosiveRadius = 0;
    game["echoSystem"].weaponStats.meteoriteMode = false;
    game["echoSystem"].weaponStats.meteoriteCount = 0;
    game["echoSystem"].weaponStats.meteoriteDuration = 0;
    game["echoSystem"].weaponStats.meteoriteSpawnRadius = 0;
    game["echoSystem"].weaponStats.meteoriteMaxRadius = 0;
    game["echoSystem"].meteoriteFireCooldown = 0;
  },
  homing_missiles: (game: Game) => {
    game["echoSystem"].weaponStats.homingStrength = 0;
    game["echoSystem"].weaponStats.homingSpeedBoost = 1.0;
    game["echoSystem"].weaponStats.homingCloneMode = false;
  },
  directional_shot: (game: Game) => {
    game["echoSystem"].weaponStats.directionalMode = false;
    game["echoSystem"].weaponStats.directionalCount = 0;
    game["echoSystem"].weaponStats.directionalNovaMode = false;
    game["echoSystem"].weaponStats.directionalNovaSpawnRadius = 0;
    game["echoSystem"].weaponStats.directionalNovaOrbitDuration = 0;
    game["echoSystem"].weaponStats.directionalNovaOrbitSpeed = 0;
  },
};

/** Color for each tier level (index 0 = T1 ... index 5 = T6) */
const TIER_COLORS: number[] = [
  0x999999, // T1 — gray
  0x00ff88, // T2 — green
  0x3399ff, // T3 — blue
  0xff44ff, // T4 — magenta
  0xff8800, // T5 — orange
  0xff2222, // T6 — red
];

export class CheatMenu {
  public container: Container;
  private game: Game | null = null;
  private weaponButtons: Container[] = [];

  // Wave tier selector widgets
  private tierLabelText: Text | null = null;
  private tierDisplayBg: Graphics | null = null;

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
      fontSize: 18,
      fill: 0xff00ff, // Magenta for dev tool
      fontWeight: "bold",
      align: "center",
    });
    const titleText = new Text({ text: "[CHEAT MENU - DEV ONLY]", style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.x = GAME_CONFIG.WIDTH / 2;
    titleText.y = 12;
    this.container.addChild(titleText);

    // Instructions
    const instructStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 9,
      fill: 0xaaaaaa,
      align: "center",
    });
    const instructText = new Text({
      text: "Press C to close  |  \u25bc = downgrade tier  |  \u25b2 = upgrade tier",
      style: instructStyle,
    });
    instructText.anchor.set(0.5);
    instructText.x = GAME_CONFIG.WIDTH / 2;
    instructText.y = 28;
    this.container.addChild(instructText);

    // Wave tier selector
    this.createWaveTierSelector();

    // Spawn boss buttons
    this.createSpawnBossRow();

    // Weapon upgrade buttons
    this.createWeaponButtons();
  }

  // =============================================================================
  // Wave Tier Selector
  // =============================================================================

  /** Create wave tier selector row: WAVE TIER: ◀ T# ▶ */
  private createWaveTierSelector(): void {
    const row = new Container();
    const rowW = 160;
    const rowH = 20;
    row.x = GAME_CONFIG.WIDTH / 2 - rowW / 2;
    row.y = 38;

    // Row background
    const bg = new Graphics();
    bg.rect(0, 0, rowW, rowH);
    bg.fill({ color: 0x1a1a2e });
    bg.stroke({ color: 0x555588, width: 1 });
    row.addChild(bg);

    // Label
    const labelStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xcccccc,
      fontWeight: "bold",
    });
    const label = new Text({ text: "WAVE:", style: labelStyle });
    label.x = 6;
    label.y = 5;
    row.addChild(label);

    // ◀ Decrement button
    const decBtn = this.createTierArrowButton("◀", 0xaa2222, 0xff4444);
    decBtn.x = rowW - 80;
    decBtn.y = 1;
    decBtn.on("pointerdown", () => this.changeForcedTier(-1));
    row.addChild(decBtn);

    // Tier display pill
    const tierPillBg = new Graphics();
    tierPillBg.rect(0, 0, 44, 18);
    tierPillBg.fill({ color: 0x222244 });
    tierPillBg.stroke({ color: 0x7777aa, width: 1 });
    tierPillBg.x = rowW - 62;
    tierPillBg.y = 1;
    row.addChild(tierPillBg);
    this.tierDisplayBg = tierPillBg;

    const tierDispStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const tierLabel = new Text({ text: "AUTO", style: tierDispStyle });
    tierLabel.anchor.set(0.5);
    tierLabel.x = tierPillBg.x + 22;
    tierLabel.y = 10;
    row.addChild(tierLabel);
    this.tierLabelText = tierLabel;

    // ▶ Increment button
    const incBtn = this.createTierArrowButton("▶", 0x226622, 0x44ff44);
    incBtn.x = rowW - 16;
    incBtn.y = 1;
    incBtn.on("pointerdown", () => this.changeForcedTier(+1));
    row.addChild(incBtn);

    this.container.addChild(row);
  }

  /** Create a "Spawn Boss" row with T1 and T2 buttons */
  private createSpawnBossRow(): void {
    const row = new Container();
    const rowW = 160;
    const rowH = 20;
    row.x = GAME_CONFIG.WIDTH / 2 - rowW / 2;
    row.y = 62; // directly below wave tier row (38 + 20 + 4px gap)

    // Row background
    const bg = new Graphics();
    bg.rect(0, 0, rowW, rowH);
    bg.fill({ color: 0x1a1a2e });
    bg.stroke({ color: 0x885555, width: 1 });
    row.addChild(bg);

    // Label
    const labelStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xcccccc,
      fontWeight: "bold",
    });
    const label = new Text({ text: "BOSS:", style: labelStyle });
    label.x = 6;
    label.y = 5;
    row.addChild(label);

    // T1 button
    const t1Btn = this.createBossSpawnButton("T1", 0x884400, 0xff8800);
    t1Btn.x = rowW - 80;
    t1Btn.y = 1;
    t1Btn.on("pointerdown", () => this.spawnBoss(1));
    row.addChild(t1Btn);

    // T2 button
    const t2Btn = this.createBossSpawnButton("T2", 0x660022, 0xff2255);
    t2Btn.x = rowW - 40;
    t2Btn.y = 1;
    t2Btn.on("pointerdown", () => this.spawnBoss(2));
    row.addChild(t2Btn);

    this.container.addChild(row);
  }

  /** Create a small labeled button for boss spawning */
  private createBossSpawnButton(label: string, normalColor: number, hoverColor: number): Container {
    const btn = new Container();
    const w = 36;
    const h = 18;

    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: normalColor, alpha: 0.9 });
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    btn.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: label, style: textStyle });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2;
    btn.addChild(text);

    btn.eventMode = "static";
    btn.cursor = "pointer";

    btn.on("pointerover", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: hoverColor });
      bg.stroke({ color: 0xffff00, width: 2 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: normalColor, alpha: 0.9 });
      bg.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    });

    return btn;
  }

  /** Force-spawn a boss of given type via SpawnSystem */
  private spawnBoss(bossType: number): void {
    if (!this.game) return;
    const playerPos = this.game["player"].state.position;
    this.game["spawnSystem"].forceSpawnBoss(playerPos, bossType);
  }

  /** Create a small left/right arrow button for the tier selector */
  private createTierArrowButton(label: string, normalColor: number, hoverColor: number): Container {
    const btn = new Container();
    const w = 16;
    const h = 18;

    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: normalColor, alpha: 0.85 });
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    btn.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: label, style: textStyle });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2;
    btn.addChild(text);

    btn.eventMode = "static";
    btn.cursor = "pointer";

    btn.on("pointerover", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: hoverColor });
      bg.stroke({ color: 0xffff00, width: 2 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: normalColor, alpha: 0.85 });
      bg.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
    });

    return btn;
  }

  /** Increment or decrement the forced spawn tier */
  private changeForcedTier(delta: number): void {
    if (!this.game) return;
    const spawnSystem = this.game["spawnSystem"];
    const current = spawnSystem.forcedTier ?? 0; // 0 means AUTO → treat as "no tier set"

    let next: number | null;
    if (current === 0) {
      // AUTO state — moving ▶ sets T1, moving ◀ sets T6 (wrap-around to max)
      next = delta > 0 ? 1 : 6;
    } else {
      const raw = current + delta;
      if (raw < 1) {
        next = null; // back to AUTO
      } else if (raw > 6) {
        next = 6; // clamp at T6
      } else {
        next = raw;
      }
    }

    spawnSystem.forcedTier = next;
    this.refreshTierDisplay();
  }

  /** Refresh the tier display label/color from spawnSystem.forcedTier */
  private refreshTierDisplay(): void {
    if (!this.tierLabelText || !this.tierDisplayBg) return;
    const forcedTier = this.game?.["spawnSystem"].forcedTier ?? null;

    if (forcedTier === null) {
      this.tierLabelText.text = "AUTO";
      (this.tierLabelText.style as TextStyle).fill = 0xaaaaaa;
      this.tierDisplayBg.clear();
      this.tierDisplayBg.rect(0, 0, 44, 18);
      this.tierDisplayBg.fill({ color: 0x222244 });
      this.tierDisplayBg.stroke({ color: 0x7777aa, width: 1 });
    } else {
      const tierIndex = Math.min(Math.max(forcedTier - 1, 0), TIER_COLORS.length - 1);
      const color = TIER_COLORS[tierIndex] ?? 0xffffff;
      this.tierLabelText.text = `T${forcedTier}`;
      (this.tierLabelText.style as TextStyle).fill = color;
      this.tierDisplayBg.clear();
      this.tierDisplayBg.rect(0, 0, 44, 18);
      this.tierDisplayBg.fill({ color: 0x111122 });
      this.tierDisplayBg.stroke({ color, width: 1.5 });
    }
  }

  // =============================================================================
  // Weapon Tier Buttons (▼ / ▲)
  // =============================================================================

  /** Create weapon upgrade buttons with down/up tier controls */
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

    const startY = 86;
    const spacingY = 25;
    const rowW = 380;
    const rowH = 21;
    const arrowBtnW = 28;

    weapons.forEach((weapon, index) => {
      const row = new Container();
      row.x = GAME_CONFIG.WIDTH / 2 - rowW / 2;
      row.y = startY + index * spacingY;

      // Row background
      const bg = new Graphics();
      bg.rect(0, 0, rowW, rowH);
      bg.fill({ color: 0x1a1a2e });
      bg.stroke({ color: 0x444466, width: 1 });
      row.addChild(bg);

      // Weapon name
      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xffffff,
        fontWeight: "bold",
      });
      const nameText = new Text({ text: weapon.name, style: nameStyle });
      nameText.x = 5;
      nameText.y = 5;
      row.addChild(nameText);

      // Tier label (center-right)
      const tierStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xaaaaaa,
      });
      const tierText = new Text({ text: "T0", style: tierStyle });
      tierText.anchor.set(0.5);
      tierText.x = rowW - arrowBtnW * 2 - 28;
      tierText.y = rowH / 2;
      row.addChild(tierText);

      // ▼ Downgrade button
      const downBtn = this.createArrowButton("▼", 0xcc2222, 0xff4444);
      downBtn.x = rowW - arrowBtnW * 2 - 4;
      downBtn.y = 1;
      downBtn.on("pointerdown", () => {
        this.downgradeWeapon(weapon.id);
      });
      row.addChild(downBtn);

      // ▲ Upgrade button
      const upBtn = this.createArrowButton("▲", 0x22aa22, 0x44ff44);
      upBtn.x = rowW - arrowBtnW - 2;
      upBtn.y = 1;
      upBtn.on("pointerdown", () => {
        this.upgradeWeapon(weapon.id);
      });
      row.addChild(upBtn);

      // Store references
      (row as Container & { weaponId: string; tierText: Text }).weaponId = weapon.id;
      (row as Container & { weaponId: string; tierText: Text }).tierText = tierText;

      this.weaponButtons.push(row);
      this.container.addChild(row);
    });
  }

  /** Create a small arrow button with given label and colors */
  private createArrowButton(label: string, normalColor: number, hoverColor: number): Container {
    const btn = new Container();
    const w = 26;
    const h = 19;

    const bg = new Graphics();
    bg.rect(0, 0, w, h);
    bg.fill({ color: normalColor, alpha: 0.8 });
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
    btn.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: label, style: textStyle });
    text.anchor.set(0.5);
    text.x = w / 2;
    text.y = h / 2;
    btn.addChild(text);

    btn.eventMode = "static";
    btn.cursor = "pointer";

    btn.on("pointerover", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: hoverColor });
      bg.stroke({ color: 0xffff00, width: 2 });
    });

    btn.on("pointerout", () => {
      bg.clear();
      bg.rect(0, 0, w, h);
      bg.fill({ color: normalColor, alpha: 0.8 });
      bg.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
    });

    return btn;
  }

  // =============================================================================
  // Upgrade / Downgrade Logic
  // =============================================================================

  /** Upgrade weapon to next tier (T0 → T1 → T2 → T3) */
  private upgradeWeapon(weaponId: string): void {
    if (!this.game) return;

    const currentTier = this.game["weaponTiers"].get(weaponId) ?? 0;
    const nextTier = Math.min(currentTier + 1, 3);

    if (nextTier === currentTier) return; // Already max tier

    const tiers = WEAPON_TIER_UPGRADES.get(weaponId);
    if (!tiers) return;

    const upgrade = tiers[nextTier - 1]; // tiers array is 0-indexed
    if (!upgrade) return;

    upgrade.apply(this.game);
    this.updateTierDisplays();
  }

  /** Downgrade weapon by one tier (T3 → T2 → T1 → T0) */
  private downgradeWeapon(weaponId: string): void {
    if (!this.game) return;

    const currentTier = this.game["weaponTiers"].get(weaponId) ?? 0;
    if (currentTier === 0) return; // Already at T0, nothing to downgrade

    const newTier = currentTier - 1;

    if (newTier === 0) {
      // Reset weapon to T0 — remove from map and zero out stats
      this.game["weaponTiers"].delete(weaponId);
      const resetFn = WEAPON_RESET_STATS[weaponId];
      if (resetFn) resetFn(this.game);
    } else {
      // Re-apply the previous tier upgrade
      const tiers = WEAPON_TIER_UPGRADES.get(weaponId);
      if (!tiers) return;
      const upgrade = tiers[newTier - 1]; // newTier=1 → tiers[0], newTier=2 → tiers[1]
      if (!upgrade) return;
      upgrade.apply(this.game);
      // Correct the tier back (upgrade.apply sets the tier as part of its logic)
      this.game["weaponTiers"].set(weaponId, newTier);
    }

    this.updateTierDisplays();
  }

  /** Update all tier displays */
  private updateTierDisplays(): void {
    if (!this.game) return;

    for (const button of this.weaponButtons) {
      const weaponId = (button as Container & { weaponId: string }).weaponId;
      const tierText = (button as Container & { tierText: Text }).tierText;
      const currentTier = this.game["weaponTiers"].get(weaponId) ?? 0;

      tierText.text = `T${currentTier}`;

      if (currentTier === 0) {
        (tierText.style as TextStyle).fill = 0x666666;
      } else if (currentTier === 1) {
        (tierText.style as TextStyle).fill = 0x00ff00;
      } else if (currentTier === 2) {
        (tierText.style as TextStyle).fill = 0x00aaff;
      } else if (currentTier === 3) {
        (tierText.style as TextStyle).fill = 0xff00ff;
      }
    }
  }

  // =============================================================================
  // Visibility
  // =============================================================================

  /** Toggle visibility */
  toggle(game: Game): void {
    this.container.visible = !this.container.visible;
    this.game = game;

    if (this.container.visible) {
      this.updateTierDisplays();
      this.refreshTierDisplay();
    }
  }

  /** Show menu */
  show(game: Game): void {
    this.container.visible = true;
    this.game = game;
    this.updateTierDisplays();
    this.refreshTierDisplay();
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
