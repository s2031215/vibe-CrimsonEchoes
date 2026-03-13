// =============================================================================
// Damage Number - Floating damage text popup
// =============================================================================

import { Container, Text, TextStyle } from "pixi.js";

const FLOAT_DISTANCE = 20; // pixels to float upward
const LIFETIME = 0.7; // seconds

export class DamageNumber {
  public container: Container;
  private label: Text;
  private timer: number = 0;
  private active: boolean = false;
  private isPlayerDamage: boolean = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fontWeight: "bold",
      fill: 0xffffff,
      dropShadow: {
        color: 0x000000,
        distance: 1,
        alpha: 0.8,
      },
    });

    this.label = new Text({ text: "", style });
    this.label.anchor.set(0.5, 1);
    this.container.addChild(this.label);
  }

  /** Activate at world position with a damage value */
  activate(x: number, y: number, damage: number, playerDamage: boolean = false): void {
    this.container.x = x;
    this.container.y = y;
    this.label.text = damage.toString();
    this.isPlayerDamage = playerDamage;
    this.timer = 0;
    this.active = true;
    this.container.visible = true;
    this.container.alpha = 1;

    // Color: red for player damage, white for enemy damage
    (this.label.style as TextStyle).fill = playerDamage ? 0xff4444 : 0xffffff;
  }

  /** Update animation — returns true when lifetime expired */
  update(dt: number): boolean {
    if (!this.active) return false;

    this.timer += dt;
    const progress = this.timer / LIFETIME;

    if (progress >= 1) {
      this.deactivate();
      return true;
    }

    // Float upward
    this.container.y -= FLOAT_DISTANCE * dt / LIFETIME;

    // Fade out linearly
    this.container.alpha = 1 - progress;

    // Slightly scale up when player-damage for emphasis
    if (this.isPlayerDamage) {
      const scale = 1 + progress * 0.3;
      this.container.scale.set(scale);
    }

    return false;
  }

  /** Deactivate and hide */
  deactivate(): void {
    this.active = false;
    this.container.visible = false;
    this.container.alpha = 1;
    this.container.scale.set(1);
  }

  /** Reset for pooling */
  reset(): void {
    this.deactivate();
    this.timer = 0;
    this.isPlayerDamage = false;
  }
}
