// =============================================================================
// HealOrb - Heart pickup dropped by HealEnemy; heals player on collection
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { distance, normalize, subtract } from "@utils/math";
import type { Vec2 } from "@/types";

const BOB_SPEED = 3;
const BOB_AMP = 2;

export class HealOrb {
  public container: Container;
  public active: boolean = false;
  public position: Vec2 = { x: 0, y: 0 };

  private glow: Graphics;
  private heart: Graphics;
  private bobTimer: number = 0;
  private baseY: number = 0;
  private magnetized: boolean = false;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    // Glow layer (redrawn each frame for pulse effect)
    this.glow = new Graphics();
    this.container.addChild(this.glow);

    // Heart layer (static, drawn once)
    this.heart = new Graphics();
    this.drawHeart();
    this.container.addChild(this.heart);
  }

  /** Draw a clean heart using bezier curves */
  private drawHeart(): void {
    this.heart.clear();

    // Heart drawn using two bezier curves meeting at the bottom tip
    // Scale: roughly 9px tall, 10px wide
    const s = 0.9; // scale factor

    // Dark pink shadow behind the heart (slightly larger, offset down)
    this.heart.fill({ color: 0x8b0026, alpha: 0.5 });
    this.heart.moveTo(0 * s, 5 * s + 1);
    this.heart.bezierCurveTo(-6 * s, -1 * s + 1, -11 * s, -6 * s + 1, -6 * s, -9 * s + 1);
    this.heart.bezierCurveTo(-3 * s, -12 * s + 1, 0 * s, -9 * s + 1, 0 * s, -6 * s + 1);
    this.heart.bezierCurveTo(0 * s, -9 * s + 1, 3 * s, -12 * s + 1, 6 * s, -9 * s + 1);
    this.heart.bezierCurveTo(11 * s, -6 * s + 1, 6 * s, -1 * s + 1, 0 * s, 5 * s + 1);

    // Main heart — vivid red
    this.heart.fill(0xff2255);
    this.heart.moveTo(0 * s, 5 * s);
    this.heart.bezierCurveTo(-6 * s, -1 * s, -11 * s, -6 * s, -6 * s, -9 * s);
    this.heart.bezierCurveTo(-3 * s, -12 * s, 0 * s, -9 * s, 0 * s, -6 * s);
    this.heart.bezierCurveTo(0 * s, -9 * s, 3 * s, -12 * s, 6 * s, -9 * s);
    this.heart.bezierCurveTo(11 * s, -6 * s, 6 * s, -1 * s, 0 * s, 5 * s);

    // Bright pink highlight (top-left lobe)
    this.heart.fill({ color: 0xff88aa, alpha: 0.75 });
    this.heart.circle(-3.5 * s, -7 * s, 2.5 * s);

    // Tiny white specular dot
    this.heart.fill({ color: 0xffffff, alpha: 0.9 });
    this.heart.circle(-2.5 * s, -8 * s, 1.2 * s);
  }

  /** Activate at world position */
  activate(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.baseY = y;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.magnetized = false;
    this.active = true;
    this.container.x = x;
    this.container.y = y;
    this.container.visible = true;
    this.container.alpha = 1;
    this.container.scale.set(1);
  }

  /** Deactivate */
  deactivate(): void {
    this.active = false;
    this.container.visible = false;
  }

  /** Update — returns true when collected by player */
  update(dt: number, playerPos: Vec2, magnetSpeed: number): boolean {
    if (!this.active) return false;

    this.bobTimer += dt * BOB_SPEED;
    const bobOffset = Math.sin(this.bobTimer) * BOB_AMP;

    // Animate glow pulse: alpha oscillates between 0.15 and 0.45
    const glowAlpha = 0.3 + Math.sin(this.bobTimer * 2.5) * 0.15;
    this.glow.clear();
    this.glow.fill({ color: 0xff2255, alpha: glowAlpha });
    this.glow.circle(0, -2, 11);

    const dist = distance(this.position, playerPos);

    if (dist < GAME_CONFIG.XP.MAGNET_RANGE) {
      this.magnetized = true;
    }

    if (this.magnetized) {
      const direction = normalize(subtract(playerPos, this.position));
      this.position.x += direction.x * magnetSpeed * dt;
      this.position.y += direction.y * magnetSpeed * dt;
      this.baseY = this.position.y;

      const pulse = 1 + Math.sin(this.bobTimer * 2) * 0.12;
      this.container.scale.set(pulse);

      if (distance(this.position, playerPos) < 8) {
        this.deactivate();
        return true;
      }
    }

    this.container.x = this.position.x;
    this.container.y = this.baseY + bobOffset;

    return false;
  }

  /** Reset for pooling */
  reset(): void {
    this.deactivate();
    this.bobTimer = 0;
    this.magnetized = false;
    this.container.scale.set(1);
    this.glow.clear();
  }
}
