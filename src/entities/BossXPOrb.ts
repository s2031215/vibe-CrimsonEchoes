// =============================================================================
// BossXPOrb - Special level-up orb dropped on boss kill
// =============================================================================

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2 } from "@/types";

const ORB_RADIUS = 4;
const BOB_SPEED = 3;
const BOB_AMP = 2;

export class BossXPOrb {
  public container: Container;
  public active: boolean = false;

  private graphics: Graphics;
  private labelText: Text;
  private bobTimer: number = 0;
  private baseY: number = 0;
  private magnetized: boolean = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Gold outer glow
    this.graphics = new Graphics();
    this.drawOrb();
    this.container.addChild(this.graphics);

    // "LV!" label
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 5,
      fontWeight: "bold",
      fill: 0x000000,
      align: "center",
    });
    this.labelText = new Text({ text: "LV", style });
    this.labelText.anchor.set(0.5);
    this.labelText.x = 1;
    this.labelText.y = 0;
    this.container.addChild(this.labelText);
  }

  private drawOrb(): void {
    this.graphics.clear();

    // Outer glow
    this.graphics.fill({ color: 0xffaa00, alpha: 0.5 });
    this.graphics.circle(0, 0, ORB_RADIUS + 4);

    // Main gold body
    this.graphics.fill(0xffd700);
    this.graphics.circle(0, 0, ORB_RADIUS);

    // Inner highlight
    this.graphics.fill(0xffff88);
    this.graphics.circle(-ORB_RADIUS * 0.25, -ORB_RADIUS * 0.25, ORB_RADIUS * 0.45);
  }

  /** Activate at world position */
  activate(x: number, y: number): void {
    this.container.x = x;
    this.container.y = y;
    this.baseY = y;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.magnetized = false;
    this.active = true;
    this.container.visible = true;
    this.container.alpha = 1;
    this.container.scale.set(1);
  }

  /** Deactivate */
  deactivate(): void {
    this.active = false;
    this.container.visible = false;
  }

  /**
   * Update — returns true when collected by player.
   * Uses same magnet speed as XP orbs (player speed + bonus).
   */
  update(dt: number, playerPos: Vec2, magnetSpeed: number): boolean {
    if (!this.active) return false;

    this.bobTimer += dt * BOB_SPEED;
    const bobOffset = Math.sin(this.bobTimer) * BOB_AMP;

    const dist = distance({ x: this.container.x, y: this.baseY }, playerPos);

    if (dist < GAME_CONFIG.XP.MAGNET_RANGE) {
      this.magnetized = true;
    }

    if (this.magnetized) {
      const pos = { x: this.container.x, y: this.container.y };
      const direction = normalize(subtract(playerPos, pos));
      this.container.x += direction.x * magnetSpeed * dt;
      this.container.y += direction.y * magnetSpeed * dt;
      this.baseY = this.container.y;

      // Pulse
      const pulse = 1 + Math.sin(this.bobTimer * 2) * 0.12;
      this.container.scale.set(pulse);

      if (distance({ x: this.container.x, y: this.container.y }, playerPos) < 10) {
        this.deactivate();
        return true;
      }
    } else {
      this.container.y = this.baseY + bobOffset;
    }

    return false;
  }

  /** Reset for pooling */
  reset(): void {
    this.deactivate();
    this.bobTimer = 0;
    this.magnetized = false;
    this.container.scale.set(1);
    this.graphics.rotation = 0;
  }
}
