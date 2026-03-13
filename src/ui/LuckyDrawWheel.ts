// =============================================================================
// LuckyDrawWheel - Spinning wheel upgrade system with dynamic upgrades
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { Upgrade } from "@/types";

/** Lucky Draw Wheel slot types */
export type WheelSlotType = "slot1" | "slot2" | "slot3" | "jackpot";

/** Wheel slot configuration */
interface WheelSlot {
  type: WheelSlotType;
  probability: number; // 0.0 to 1.0
  color: number;
  upgrade: Upgrade | null; // null for jackpot
}

export class LuckyDrawWheel {
  public container: Container;
  private wheelContainer: Container;
  private wheelGraphics: Graphics;
  private pointerGraphics: Graphics;
  private resultText: Text;
  private spinButton: Container;
  private continueButton: Container;

  // Left-side slot detail panel
  private slotDetailPanel: Container;

  // Jackpot popup
  private jackpotPopup: Container;
  private jackpotUpgradeRows: Container[] = [];

  private onResultCallback: ((slotType: WheelSlotType, boost: Upgrade | null) => void) | null = null;

  private isSpinning: boolean = false;
  private waitingForUser: boolean = false;
  private spinRotation: number = 0; // Current rotation in radians
  private targetRotation: number = 0; // Final rotation target
  private spinDuration: number = 0; // Time spent spinning
  private selectedSlotIndex: number = 0; // Store winning slot index

  private currentUpgrades: Upgrade[] = []; // 3 upgrades for this spin
  private slots: WheelSlot[] = []; // Dynamic slots generated from upgrades

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Dim overlay (also serves as click area for continue)
    const overlay = new Graphics();
    overlay.rect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    overlay.eventMode = "static"; // Block clicks beneath
    this.container.addChild(overlay);

    // Title
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 20,
      fill: 0xffd700,
      fontWeight: "bold",
      align: "center",
      dropShadow: {
        color: 0x000000,
        distance: 2,
        alpha: 1,
      },
    });
    const titleText = new Text({ text: "LUCKY DRAW WHEEL", style: titleStyle });
    titleText.anchor.set(0.5);
    titleText.x = GAME_CONFIG.WIDTH / 2 + 40; // Shift right slightly to account for left panel
    titleText.y = 20;
    this.container.addChild(titleText);

    // Wheel container (for rotation) — shifted right to make room for left panel
    this.wheelContainer = new Container();
    this.wheelContainer.x = GAME_CONFIG.WIDTH / 2 + 40;
    this.wheelContainer.y = 115;
    this.container.addChild(this.wheelContainer);

    // Wheel graphics
    this.wheelGraphics = new Graphics();
    this.wheelContainer.addChild(this.wheelGraphics);

    // Pointer (fixed, points to top of wheel)
    this.pointerGraphics = new Graphics();
    this.pointerGraphics.x = GAME_CONFIG.WIDTH / 2 + 40;
    this.pointerGraphics.y = 48;
    this.container.addChild(this.pointerGraphics);
    this.drawPointer();

    // Result text (shown after spin, hidden during jackpot popup)
    const resultStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: 0xffffff,
      align: "center",
      wordWrap: true,
      wordWrapWidth: 220,
    });
    this.resultText = new Text({ text: "", style: resultStyle });
    this.resultText.anchor.set(0.5);
    this.resultText.x = GAME_CONFIG.WIDTH / 2 + 40;
    this.resultText.y = 200;
    this.container.addChild(this.resultText);

    // Left-side slot detail panel (built empty, filled in show())
    this.slotDetailPanel = new Container();
    this.container.addChild(this.slotDetailPanel);

    // Spin button
    this.spinButton = this.createSpinButton();
    this.container.addChild(this.spinButton);

    // Continue button (initially hidden)
    this.continueButton = this.createContinueButton();
    this.container.addChild(this.continueButton);

    // Jackpot popup (initially hidden)
    this.jackpotPopup = new Container();
    this.jackpotPopup.visible = false;
    this.buildJackpotPopup();
    this.container.addChild(this.jackpotPopup);

    // Click handler for continue (overlay click)
    overlay.on("pointerdown", () => {
      if (this.waitingForUser) {
        this.onExit();
      }
    });
  }

  /** Generate slots from 3 upgrades + jackpot */
  private generateSlots(upgrades: Upgrade[]): WheelSlot[] {
    const slots: WheelSlot[] = [];

    // Create 3 slots from upgrades
    for (let i = 0; i < 3; i++) {
      const upgrade = upgrades[i];
      if (!upgrade) continue;

      // Determine color based on upgrade type
      let color: number;
      if (upgrade.type === "weapon") {
        color = 0xef4444; // Red
      } else if (upgrade.type === "stat") {
        color = 0x3b82f6; // Blue
      } else if (upgrade.type === "heal") {
        color = 0x10b981; // Green
      } else {
        color = 0x8b5cf6; // Purple (fallback)
      }

      slots.push({
        type: `slot${i + 1}` as WheelSlotType,
        probability: 0.3,
        color,
        upgrade,
      });
    }

    // Add jackpot slot (10% chance for all 3)
    slots.push({
      type: "jackpot",
      probability: 0.1,
      color: 0xf59e0b, // Gold
      upgrade: null,
    });

    return slots;
  }

  /** Abbreviate long upgrade names for wheel display */
  private abbreviateName(name: string): string {
    const shortened = name
      .replace("Rounds", "Rds")
      .replace("Lightning", "Light")
      .replace("Missiles", "Miss")
      .replace("Explosive", "Expl")
      .replace("Piercing", "Pierce");

    if (shortened.length > 15) {
      return shortened.substring(0, 13) + "..";
    }

    return shortened;
  }

  /** Draw the wheel with 4 colored segments and upgrade labels */
  private drawWheel(): void {
    // Clear old wheel content
    this.wheelContainer.removeChildren();
    this.wheelContainer.addChild(this.wheelGraphics);
    this.wheelGraphics.clear();

    const radius = 60;

    let cumulativeAngle = -Math.PI / 2; // Start from top

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot) continue;

      const slotAngle = slot.probability * Math.PI * 2;
      const startAngle = cumulativeAngle;
      const endAngle = startAngle + slotAngle;

      // Draw colored segment
      this.wheelGraphics.beginPath();
      this.wheelGraphics.moveTo(0, 0);
      this.wheelGraphics.arc(0, 0, radius, startAngle, endAngle);
      this.wheelGraphics.lineTo(0, 0);
      this.wheelGraphics.fill({ color: slot.color, alpha: 1.0 });

      // Draw border
      this.wheelGraphics.beginPath();
      this.wheelGraphics.moveTo(0, 0);
      this.wheelGraphics.arc(0, 0, radius, startAngle, endAngle);
      this.wheelGraphics.lineTo(0, 0);
      this.wheelGraphics.stroke({ color: 0xffffff, width: 2 });

      // Draw label (rotated to slot center)
      const midAngle = startAngle + slotAngle / 2;
      const labelRadius = radius * 0.65;
      const labelX = Math.cos(midAngle) * labelRadius;
      const labelY = Math.sin(midAngle) * labelRadius;

      cumulativeAngle = endAngle;

      let labelText: string;
      let fontSize: number;

      if (slot.type === "jackpot") {
        labelText = "ALL";
        fontSize = 9;
      } else if (slot.upgrade) {
        labelText = this.abbreviateName(slot.upgrade.name);
        fontSize = 8;
      } else {
        labelText = "???";
        fontSize = 8;
      }

      const labelStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize,
        fill: 0xffffff,
        fontWeight: "bold",
        align: "center",
      });
      const label = new Text({ text: labelText, style: labelStyle });
      label.anchor.set(0.5);
      label.x = labelX;
      label.y = labelY;
      label.rotation = midAngle + Math.PI / 2;
      this.wheelContainer.addChild(label);
    }

    // Draw center circle
    this.wheelGraphics.circle(0, 0, 10);
    this.wheelGraphics.fill({ color: 0x222222, alpha: 1.0 });
    this.wheelGraphics.circle(0, 0, 10);
    this.wheelGraphics.stroke({ color: 0xffffff, width: 2 });
  }

  // =============================================================================
  // Left-Side Slot Detail Panel
  // =============================================================================

  /** Draw the left-side slot detail panel showing all slots with percentages */
  private drawSlotDetailPanel(): void {
    // Clear previous content
    this.slotDetailPanel.removeChildren();

    const panelX = 4;
    const panelY = 30;
    const panelW = 136;
    const panelH = 200;

    // Panel background
    const bg = new Graphics();
    bg.rect(panelX, panelY, panelW, panelH);
    bg.fill({ color: 0x0d0d1a, alpha: 0.95 });
    bg.rect(panelX, panelY, panelW, panelH);
    bg.stroke({ color: 0xffd700, width: 1.5 });
    this.slotDetailPanel.addChild(bg);

    // Panel header
    const headerStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: 0xffd700,
      fontWeight: "bold",
      align: "center",
    });
    const header = new Text({ text: "SLOT DETAILS", style: headerStyle });
    header.anchor.set(0.5);
    header.x = panelX + panelW / 2;
    header.y = panelY + 8;
    this.slotDetailPanel.addChild(header);

    // Divider line
    const divider = new Graphics();
    divider.moveTo(panelX + 4, panelY + 17);
    divider.lineTo(panelX + panelW - 4, panelY + 17);
    divider.stroke({ color: 0xffd700, width: 1, alpha: 0.5 });
    this.slotDetailPanel.addChild(divider);

    // Slot rows
    const rowStartY = panelY + 22;
    const rowHeight = 44;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot) continue;

      const rowY = rowStartY + i * rowHeight;
      const rowContainer = new Container();
      this.slotDetailPanel.addChild(rowContainer);

      // Color swatch
      const swatch = new Graphics();
      swatch.rect(panelX + 5, rowY, 10, 10);
      swatch.fill({ color: slot.color });
      swatch.rect(panelX + 5, rowY, 10, 10);
      swatch.stroke({ color: 0xffffff, width: 1 });
      rowContainer.addChild(swatch);

      // Percentage badge
      const pct = Math.round(slot.probability * 100);
      const pctStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 9,
        fill: slot.color,
        fontWeight: "bold",
      });
      const pctText = new Text({ text: `${pct}%`, style: pctStyle });
      pctText.x = panelX + panelW - 28;
      pctText.y = rowY;
      rowContainer.addChild(pctText);

      // Slot name
      let slotName: string;
      if (slot.type === "jackpot") {
        slotName = "JACKPOT";
      } else if (slot.upgrade) {
        slotName = slot.upgrade.name;
      } else {
        slotName = "???";
      }

      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 8,
        fill: 0xffffff,
        fontWeight: "bold",
        wordWrap: true,
        wordWrapWidth: panelW - 20,
      });
      const nameText = new Text({ text: slotName, style: nameStyle });
      nameText.x = panelX + 5;
      nameText.y = rowY + 13;
      rowContainer.addChild(nameText);

      // Description
      let descStr: string;
      if (slot.type === "jackpot") {
        descStr = "Win ALL 3 upgrades!";
      } else if (slot.upgrade) {
        descStr = slot.upgrade.description;
      } else {
        descStr = "";
      }

      const descStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 7,
        fill: 0xaaaaaa,
        wordWrap: true,
        wordWrapWidth: panelW - 12,
      });
      const descText = new Text({ text: descStr, style: descStyle });
      descText.x = panelX + 5;
      descText.y = rowY + 24;
      rowContainer.addChild(descText);

      // Row separator (except last)
      if (i < this.slots.length - 1) {
        const sep = new Graphics();
        sep.moveTo(panelX + 4, rowY + rowHeight - 2);
        sep.lineTo(panelX + panelW - 4, rowY + rowHeight - 2);
        sep.stroke({ color: 0x333355, width: 1 });
        rowContainer.addChild(sep);
      }
    }

    // Hint at bottom
    const hintStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 7,
      fill: 0x666688,
      align: "center",
    });
    const hint = new Text({ text: "Press ENTER or\nclick SPIN!", style: hintStyle });
    hint.anchor.set(0.5);
    hint.x = panelX + panelW / 2;
    hint.y = panelY + panelH - 10;
    this.slotDetailPanel.addChild(hint);
  }

  // =============================================================================
  // Jackpot Popup
  // =============================================================================

  /** Build the jackpot popup container (initially empty, populated on show) */
  private buildJackpotPopup(): void {
    const popW = 290;
    const popH = 160;
    const popX = (GAME_CONFIG.WIDTH - popW) / 2;
    const popY = (GAME_CONFIG.HEIGHT - popH) / 2 - 10;

    // Outer glow / shadow
    const shadow = new Graphics();
    shadow.rect(popX + 4, popY + 4, popW, popH);
    shadow.fill({ color: 0xffaa00, alpha: 0.3 });
    this.jackpotPopup.addChild(shadow);

    // Background
    const bg = new Graphics();
    bg.rect(popX, popY, popW, popH);
    bg.fill({ color: 0x0a0a15 });
    bg.rect(popX, popY, popW, popH);
    bg.stroke({ color: 0xffd700, width: 3 });
    this.jackpotPopup.addChild(bg);

    // Inner border accent
    const innerBorder = new Graphics();
    innerBorder.rect(popX + 4, popY + 4, popW - 8, popH - 8);
    innerBorder.stroke({ color: 0xffaa00, width: 1, alpha: 0.5 });
    this.jackpotPopup.addChild(innerBorder);

    // Header background stripe
    const headerBg = new Graphics();
    headerBg.rect(popX + 3, popY + 3, popW - 6, 24);
    headerBg.fill({ color: 0xffd700, alpha: 0.15 });
    this.jackpotPopup.addChild(headerBg);

    // Header title
    const titleStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0xffd700,
      fontWeight: "bold",
      align: "center",
      dropShadow: {
        color: 0xffaa00,
        distance: 0,
        blur: 6,
        alpha: 0.9,
      },
    });
    const title = new Text({ text: "*** JACKPOT! YOU WIN ALL 3! ***", style: titleStyle });
    title.anchor.set(0.5);
    title.x = popX + popW / 2;
    title.y = popY + 15;
    this.jackpotPopup.addChild(title);

    // Divider
    const div = new Graphics();
    div.moveTo(popX + 8, popY + 27);
    div.lineTo(popX + popW - 8, popY + 27);
    div.stroke({ color: 0xffd700, width: 1 });
    this.jackpotPopup.addChild(div);

    // 3 upgrade rows (populated dynamically in showJackpotPopup)
    const rowStartY = popY + 32;
    const rowH = 38;

    for (let i = 0; i < 3; i++) {
      const row = new Container();
      row.y = rowStartY + i * rowH;

      // Swatch (color set dynamically)
      const swatch = new Graphics();
      swatch.name = "swatch";
      swatch.rect(popX + 8, 0, 12, 12);
      swatch.fill({ color: 0xffd700 });
      row.addChild(swatch);

      // Name text
      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xffffff,
        fontWeight: "bold",
      });
      const nameText = new Text({ text: "", style: nameStyle });
      nameText.name = "nameText";
      nameText.x = popX + 26;
      nameText.y = 0;
      row.addChild(nameText);

      // Tier badge
      const tierStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0xffd700,
      });
      const tierText = new Text({ text: "", style: tierStyle });
      tierText.name = "tierText";
      tierText.anchor.set(1, 0);
      tierText.x = popX + popW - 8;
      tierText.y = 0;
      row.addChild(tierText);

      // Description text
      const descStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 8,
        fill: 0xaaaaaa,
        wordWrap: true,
        wordWrapWidth: popW - 36,
      });
      const descText = new Text({ text: "", style: descStyle });
      descText.name = "descText";
      descText.x = popX + 26;
      descText.y = 14;
      row.addChild(descText);

      // Row separator (except last)
      if (i < 2) {
        const sep = new Graphics();
        sep.moveTo(popX + 8, rowH - 2);
        sep.lineTo(popX + popW - 8, rowH - 2);
        sep.stroke({ color: 0x333355, width: 1 });
        row.addChild(sep);
      }

      this.jackpotUpgradeRows.push(row);
      this.jackpotPopup.addChild(row);
    }

    // Footer hint
    const footerStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 8,
      fill: 0x888888,
      align: "center",
    });
    const footer = new Text({ text: "Click CONTINUE or press ENTER / SPACE", style: footerStyle });
    footer.anchor.set(0.5);
    footer.x = popX + popW / 2;
    footer.y = popY + popH - 8;
    this.jackpotPopup.addChild(footer);
  }

  /** Show jackpot popup with upgrade details */
  private showJackpotPopup(upgrades: Upgrade[]): void {
    for (let i = 0; i < 3; i++) {
      const upgrade = upgrades[i];
      const row = this.jackpotUpgradeRows[i];
      if (!upgrade || !row) continue;

      // Determine color
      let color: number;
      if (upgrade.type === "weapon") {
        color = 0xef4444;
      } else if (upgrade.type === "stat") {
        color = 0x3b82f6;
      } else if (upgrade.type === "heal") {
        color = 0x10b981;
      } else {
        color = 0xffd700;
      }

      // Update swatch color
      const swatch = row.getChildByName("swatch") as Graphics | null;
      if (swatch) {
        const popX = (GAME_CONFIG.WIDTH - 290) / 2;
        swatch.clear();
        swatch.rect(popX + 8, 0, 12, 12);
        swatch.fill({ color });
        swatch.rect(popX + 8, 0, 12, 12);
        swatch.stroke({ color: 0xffffff, width: 1 });
      }

      // Update name
      const nameText = row.getChildByName("nameText") as Text | null;
      if (nameText) {
        nameText.text = upgrade.name;
        (nameText.style as TextStyle).fill = color;
      }

      // Update tier badge
      const tierText = row.getChildByName("tierText") as Text | null;
      if (tierText) {
        if (upgrade.type === "weapon" && upgrade.tier) {
          tierText.text = `T${upgrade.tier}`;
        } else if (upgrade.type === "heal") {
          tierText.text = "HEAL";
          (tierText.style as TextStyle).fill = 0x10b981;
        } else {
          tierText.text = upgrade.type.toUpperCase();
          (tierText.style as TextStyle).fill = 0x3b82f6;
        }
      }

      // Update description
      const descText = row.getChildByName("descText") as Text | null;
      if (descText) {
        descText.text = upgrade.description;
      }
    }

    this.jackpotPopup.visible = true;
    // Hide the plain result text when popup is shown
    this.resultText.visible = false;
  }

  /** Hide jackpot popup */
  private hideJackpotPopup(): void {
    this.jackpotPopup.visible = false;
    this.resultText.visible = true;
  }

  // =============================================================================
  // Pointer
  // =============================================================================

  /** Draw pointer at top of wheel */
  private drawPointer(): void {
    this.pointerGraphics.clear();

    // Red triangle pointing down
    this.pointerGraphics.beginPath();
    this.pointerGraphics.moveTo(0, 0);
    this.pointerGraphics.lineTo(-8, -15);
    this.pointerGraphics.lineTo(8, -15);
    this.pointerGraphics.lineTo(0, 0);
    this.pointerGraphics.fill({ color: 0xff0000, alpha: 1.0 });
    this.pointerGraphics.stroke({ color: 0xffffff, width: 2 });
  }

  // =============================================================================
  // Buttons
  // =============================================================================

  /** Create spin button */
  private createSpinButton(): Container {
    const button = new Container();
    button.x = GAME_CONFIG.WIDTH / 2 + 40 - 60;
    button.y = 228;

    const bg = new Graphics();
    bg.rect(0, 0, 120, 28);
    bg.fill({ color: 0x10b981 });
    bg.stroke({ color: 0xffffff, width: 2 });
    button.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: "SPIN!  [Enter]", style: textStyle });
    text.anchor.set(0.5);
    text.x = 60;
    text.y = 14;
    button.addChild(text);

    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerover", () => {
      if (!this.isSpinning && button.visible) {
        bg.clear();
        bg.rect(0, 0, 120, 28);
        bg.fill({ color: 0x14b885 });
        bg.stroke({ color: 0xffff00, width: 3 });
      }
    });

    button.on("pointerout", () => {
      if (!this.isSpinning && button.visible) {
        bg.clear();
        bg.rect(0, 0, 120, 28);
        bg.fill({ color: 0x10b981 });
        bg.stroke({ color: 0xffffff, width: 2 });
      }
    });

    button.on("pointerdown", () => {
      if (!this.isSpinning && button.visible) {
        this.startSpin();
      }
    });

    return button;
  }

  /** Create continue button */
  private createContinueButton(): Container {
    const button = new Container();
    button.x = GAME_CONFIG.WIDTH / 2 + 40 - 70;
    button.y = 228;
    button.visible = false;

    const bg = new Graphics();
    bg.rect(0, 0, 140, 28);
    bg.fill({ color: 0x3b82f6 });
    bg.stroke({ color: 0xffffff, width: 2 });
    button.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: "CONTINUE [Enter]", style: textStyle });
    text.anchor.set(0.5);
    text.x = 70;
    text.y = 14;
    button.addChild(text);

    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerover", () => {
      if (button.visible) {
        bg.clear();
        bg.rect(0, 0, 140, 28);
        bg.fill({ color: 0x2563eb });
        bg.stroke({ color: 0xffff00, width: 3 });
      }
    });

    button.on("pointerout", () => {
      if (button.visible) {
        bg.clear();
        bg.rect(0, 0, 140, 28);
        bg.fill({ color: 0x3b82f6 });
        bg.stroke({ color: 0xffffff, width: 2 });
      }
    });

    button.on("pointerdown", () => {
      if (button.visible) {
        this.onExit();
      }
    });

    return button;
  }

  // =============================================================================
  // Public API
  // =============================================================================

  /** Show wheel with 3 upgrades */
  show(upgrades: Upgrade[], onResult: (slotType: WheelSlotType, boost: Upgrade | null) => void): void {
    this.container.visible = true;
    this.currentUpgrades = upgrades;
    this.onResultCallback = onResult;

    // Generate dynamic slots from upgrades
    this.slots = this.generateSlots(upgrades);

    // Redraw wheel with new slots
    this.drawWheel();

    // Draw left-side slot detail panel
    this.drawSlotDetailPanel();

    // Reset state
    this.resultText.text = "Click SPIN or press Enter!";
    this.resultText.style.fill = 0xffffff;
    this.resultText.visible = true;
    this.isSpinning = false;
    this.waitingForUser = false;
    this.spinRotation = 0;
    this.selectedSlotIndex = 0;
    this.wheelContainer.rotation = 0;
    this.spinButton.visible = true;
    this.continueButton.visible = false;

    // Ensure jackpot popup hidden
    this.hideJackpotPopup();
  }

  /** Start spinning the wheel */
  private startSpin(): void {
    if (this.isSpinning) return;

    // Hide SPIN button immediately
    this.spinButton.visible = false;

    this.isSpinning = true;
    this.spinDuration = 0;
    this.resultText.text = "Spinning...";

    // Pick random slot based on probabilities
    const roll = Math.random();
    let cumulative = 0;
    let selectedSlotIndex = 0;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot) continue;
      cumulative += slot.probability;
      if (roll < cumulative) {
        selectedSlotIndex = i;
        break;
      }
    }

    this.selectedSlotIndex = selectedSlotIndex;

    // Calculate target rotation so the pointer (fixed at top = -π/2 in world space)
    // lands inside the selected slot.
    const selectedSlot = this.slots[selectedSlotIndex];
    if (!selectedSlot) return;

    let slotVisualStart = -Math.PI / 2;
    for (let i = 0; i < selectedSlotIndex; i++) {
      const prevSlot = this.slots[i];
      if (prevSlot) slotVisualStart += prevSlot.probability * Math.PI * 2;
    }

    const slotAngle = selectedSlot.probability * Math.PI * 2;
    const slotVisualCenter = slotVisualStart + slotAngle / 2;

    const rawTarget = -Math.PI / 2 - slotVisualCenter;
    const normalizedTarget = ((rawTarget % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    const randomOffset = (Math.random() - 0.5) * slotAngle * 0.8;

    const baseRotations = 3;
    this.targetRotation = baseRotations * Math.PI * 2 + normalizedTarget + randomOffset;
  }

  /** Update wheel animation */
  update(dt: number): void {
    if (!this.isSpinning) return;

    this.spinDuration += dt;

    const spinTime = 3.0;
    const progress = Math.min(this.spinDuration / spinTime, 1.0);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    this.spinRotation = this.targetRotation * easeProgress;
    this.wheelContainer.rotation = this.spinRotation;

    if (progress >= 1.0) {
      this.isSpinning = false;
      this.onSpinComplete();
    }
  }

  /** Handle spin completion */
  private onSpinComplete(): void {
    const selectedSlot = this.slots[this.selectedSlotIndex];
    if (!selectedSlot) return;

    if (selectedSlot.type === "jackpot") {
      // Show the dedicated jackpot popup with all 3 upgrade details
      this.showJackpotPopup(this.currentUpgrades);
    } else {
      // Single upgrade: Show full details in result text
      const upgrade = selectedSlot.upgrade;
      if (upgrade) {
        this.resultText.text = `You got:\n${upgrade.name}\n${upgrade.description}`;
        this.resultText.style.fill = selectedSlot.color;
      }
    }

    // Show continue button and wait for user
    this.waitingForUser = true;
    this.continueButton.visible = true;
  }

  /** Handle user exit */
  private onExit(): void {
    if (!this.waitingForUser) return;

    const selectedSlot = this.slots[this.selectedSlotIndex];
    if (!selectedSlot) return;

    if (this.onResultCallback) {
      let selectedUpgrade: Upgrade | null = null;

      if (selectedSlot.type !== "jackpot") {
        selectedUpgrade = selectedSlot.upgrade;
      }

      this.onResultCallback(selectedSlot.type, selectedUpgrade);
    }

    this.hide();
  }

  /** Hide wheel */
  hide(): void {
    this.container.visible = false;
    this.onResultCallback = null;
    this.currentUpgrades = [];
    this.slots = [];
    this.waitingForUser = false;
    this.spinButton.visible = true;
    this.continueButton.visible = false;
    this.hideJackpotPopup();
  }

  /** Check if wheel is visible */
  isVisible(): boolean {
    return this.container.visible;
  }

  /** Check if waiting for user to continue */
  isWaitingForUser(): boolean {
    return this.waitingForUser;
  }

  /** Trigger exit (called from external keyboard handler) */
  triggerExit(): void {
    this.onExit();
  }

  /**
   * Trigger spin from external keyboard handler (e.g. Enter key).
   * Only spins if the wheel is visible, not already spinning, and not waiting for user.
   */
  triggerSpin(): void {
    if (this.container.visible && !this.isSpinning && !this.waitingForUser) {
      this.startSpin();
    }
  }
}
