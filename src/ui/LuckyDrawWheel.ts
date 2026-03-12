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
    titleText.x = GAME_CONFIG.WIDTH / 2;
    titleText.y = 20;
    this.container.addChild(titleText);

    // Wheel container (for rotation)
    this.wheelContainer = new Container();
    this.wheelContainer.x = GAME_CONFIG.WIDTH / 2;
    this.wheelContainer.y = 110;
    this.container.addChild(this.wheelContainer);

    // Wheel graphics
    this.wheelGraphics = new Graphics();
    this.wheelContainer.addChild(this.wheelGraphics);

    // Pointer (fixed, points to top of wheel)
    this.pointerGraphics = new Graphics();
    this.pointerGraphics.x = GAME_CONFIG.WIDTH / 2;
    this.pointerGraphics.y = 45;
    this.container.addChild(this.pointerGraphics);
    this.drawPointer();

    // Result text
    const resultStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 12,
      fill: 0xffffff,
      align: "center",
      wordWrap: true,
      wordWrapWidth: 400,
    });
    this.resultText = new Text({ text: "", style: resultStyle });
    this.resultText.anchor.set(0.5);
    this.resultText.x = GAME_CONFIG.WIDTH / 2;
    this.resultText.y = 190;
    this.container.addChild(this.resultText);

    // Spin button
    this.spinButton = this.createSpinButton();
    this.container.addChild(this.spinButton);

    // Continue button (initially hidden)
    this.continueButton = this.createContinueButton();
    this.container.addChild(this.continueButton);

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
    // Shorten common patterns
    const shortened = name
      .replace("Rounds", "Rds")
      .replace("Lightning", "Light")
      .replace("Missiles", "Miss")
      .replace("Explosive", "Expl")
      .replace("Piercing", "Pierce");

    // If still too long (>15 chars), truncate
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

    // Calculate cumulative angles based on probabilities (proportional sizing)
    let cumulativeAngle = -Math.PI / 2; // Start from top

    // Draw each slot with proportional size
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot) continue;

      // Slot size is proportional to its probability
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

      // Advance cumulative angle for next slot
      cumulativeAngle = endAngle;

      // Determine label text
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
      label.rotation = midAngle + Math.PI / 2; // Orient text radially
      this.wheelContainer.addChild(label);
    }

    // Draw center circle
    this.wheelGraphics.circle(0, 0, 10);
    this.wheelGraphics.fill({ color: 0x222222, alpha: 1.0 });
    this.wheelGraphics.circle(0, 0, 10);
    this.wheelGraphics.stroke({ color: 0xffffff, width: 2 });
  }

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

  /** Create spin button */
  private createSpinButton(): Container {
    const button = new Container();
    button.x = GAME_CONFIG.WIDTH / 2 - 60;
    button.y = 220;

    const bg = new Graphics();
    bg.rect(0, 0, 120, 30);
    bg.fill({ color: 0x10b981 });
    bg.stroke({ color: 0xffffff, width: 2 });
    button.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: "SPIN!", style: textStyle });
    text.anchor.set(0.5);
    text.x = 60;
    text.y = 15;
    button.addChild(text);

    // Make interactive
    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerover", () => {
      if (!this.isSpinning && button.visible) {
        bg.clear();
        bg.rect(0, 0, 120, 30);
        bg.fill({ color: 0x14b885 });
        bg.stroke({ color: 0xffff00, width: 3 });
      }
    });

    button.on("pointerout", () => {
      if (!this.isSpinning && button.visible) {
        bg.clear();
        bg.rect(0, 0, 120, 30);
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
    button.x = GAME_CONFIG.WIDTH / 2 - 70;
    button.y = 220;
    button.visible = false;

    const bg = new Graphics();
    bg.rect(0, 0, 140, 30);
    bg.fill({ color: 0x3b82f6 });
    bg.stroke({ color: 0xffffff, width: 2 });
    button.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xffffff,
      fontWeight: "bold",
      align: "center",
    });
    const text = new Text({ text: "CONTINUE", style: textStyle });
    text.anchor.set(0.5);
    text.x = 70;
    text.y = 15;
    button.addChild(text);

    // Make interactive
    button.eventMode = "static";
    button.cursor = "pointer";

    button.on("pointerover", () => {
      if (button.visible) {
        bg.clear();
        bg.rect(0, 0, 140, 30);
        bg.fill({ color: 0x2563eb });
        bg.stroke({ color: 0xffff00, width: 3 });
      }
    });

    button.on("pointerout", () => {
      if (button.visible) {
        bg.clear();
        bg.rect(0, 0, 140, 30);
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

  /** Show wheel with 3 upgrades */
  show(upgrades: Upgrade[], onResult: (slotType: WheelSlotType, boost: Upgrade | null) => void): void {
    this.container.visible = true;
    this.currentUpgrades = upgrades;
    this.onResultCallback = onResult;
    
    // Generate dynamic slots from upgrades
    this.slots = this.generateSlots(upgrades);
    
    // Redraw wheel with new slots
    this.drawWheel();
    
    // Reset state
    this.resultText.text = "Click SPIN to test your luck!";
    this.resultText.style.fill = 0xffffff;
    this.isSpinning = false;
    this.waitingForUser = false;
    this.spinRotation = 0;
    this.selectedSlotIndex = 0;
    this.wheelContainer.rotation = 0;
    this.spinButton.visible = true;
    this.continueButton.visible = false;
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

    // Store selected slot index for later use
    this.selectedSlotIndex = selectedSlotIndex;

    // Calculate target rotation so the pointer (fixed at top = -π/2 in world space)
    // lands inside the selected slot.
    //
    // drawWheel() starts painting slots from cumulativeAngle = -π/2, so the visual
    // start of slot i in the *unrotated* wheel is:
    //   slotVisualStart = -π/2 + sum of previous slot angles
    //
    // After the wheel rotates by R, a point that was at angle A on the wheel is now
    // at world angle A + R.  For the pointer (at -π/2) to hit that point:
    //   A + R = -π/2  →  R = -π/2 - A
    //
    // We want R to be a large positive number (several full spins), so we normalise
    // to [0, 2π) then add full base rotations.

    const selectedSlot = this.slots[selectedSlotIndex];
    if (!selectedSlot) return;

    // Visual start angle of the selected slot in the unrotated wheel
    let slotVisualStart = -Math.PI / 2; // matches drawWheel's initial cumulativeAngle
    for (let i = 0; i < selectedSlotIndex; i++) {
      const prevSlot = this.slots[i];
      if (prevSlot) slotVisualStart += prevSlot.probability * Math.PI * 2;
    }

    const slotAngle = selectedSlot.probability * Math.PI * 2;
    const slotVisualCenter = slotVisualStart + slotAngle / 2;

    // Rotation needed to put slotVisualCenter under the pointer
    const rawTarget = -Math.PI / 2 - slotVisualCenter;
    // Normalise to [0, 2π) so the wheel always spins forward
    const normalizedTarget = ((rawTarget % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Random offset within 80% of the slot so it never lands on a boundary
    const randomOffset = (Math.random() - 0.5) * slotAngle * 0.8;

    const baseRotations = 3; // Spin 3 full rotations before settling
    this.targetRotation = baseRotations * Math.PI * 2 + normalizedTarget + randomOffset;
  }

  /** Update wheel animation */
  update(dt: number): void {
    if (!this.isSpinning) return;

    this.spinDuration += dt;

    // Decelerate over time (ease-out cubic)
    const spinTime = 3.0; // 3 seconds total spin time
    const progress = Math.min(this.spinDuration / spinTime, 1.0);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    // Update rotation
    this.spinRotation = this.targetRotation * easeProgress;
    this.wheelContainer.rotation = this.spinRotation;

    // Check if spin is complete
    if (progress >= 1.0) {
      this.isSpinning = false;
      this.onSpinComplete();
    }
  }

  /** Handle spin completion */
  private onSpinComplete(): void {
    // Use stored slot index instead of recalculating
    const selectedSlot = this.slots[this.selectedSlotIndex];

    if (!selectedSlot) return;

    // Show result with detailed descriptions
    if (selectedSlot.type === "jackpot") {
      // Jackpot: Show all 3 upgrades with full details
      let resultMsg = "🎉 JACKPOT! You got ALL 3: 🎉\n\n";
      for (const upgrade of this.currentUpgrades) {
        resultMsg += `• ${upgrade.name}\n  ${upgrade.description}\n\n`;
      }
      this.resultText.text = resultMsg;
      this.resultText.style.fill = 0xffd700;
    } else {
      // Single upgrade: Show full details
      const upgrade = selectedSlot.upgrade;
      if (upgrade) {
        this.resultText.text = `You got:\n${upgrade.name}\n${upgrade.description}`;
        this.resultText.style.fill = 0xffffff;
      }
    }

    // Show continue button and wait for user
    this.waitingForUser = true;
    this.continueButton.visible = true;
  }

  /** Handle user exit */
  private onExit(): void {
    if (!this.waitingForUser) return;

    // Use stored slot index instead of recalculating
    const selectedSlot = this.slots[this.selectedSlotIndex];

    if (!selectedSlot) return;

    // Invoke callback
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
}
