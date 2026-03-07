// =============================================================================
// Health Bar UI
// =============================================================================

import { Container, Sprite, Texture } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";

export class HealthBar {
  public container: Container;
  private hearts: Sprite[] = [];
  private maxHearts: number;
  private heartFilledTexture: Texture;
  private heartEmptyTexture: Texture;

  constructor() {
    this.container = new Container();
    this.container.x = 8;
    this.container.y = 8;

    this.heartFilledTexture = this.createHeartTexture(true);
    this.heartEmptyTexture = this.createHeartTexture(false);

    this.maxHearts = GAME_CONFIG.PLAYER.MAX_HEALTH;
    this.createHearts();
  }

  /** Procedurally generate a normal heart texture (8-bit style) */
  private createHeartTexture(filled: boolean): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // CLASSIC 8-BIT HEART SHAPE
      
      const heartPixels: Array<[number, number[]]> = [
        // Row by row pixel map (y, x positions)
        [2, [4,5,6, 9,10,11]], // Top bumps
        [3, [3,4,5,6,7, 8,9,10,11,12]], // Upper part
        [4, [2,3,4,5,6,7,8,9,10,11,12,13]], // Widest part
        [5, [2,3,4,5,6,7,8,9,10,11,12,13]], 
        [6, [3,4,5,6,7,8,9,10,11,12]], 
        [7, [4,5,6,7,8,9,10,11]], 
        [8, [5,6,7,8,9,10]], 
        [9, [6,7,8,9]], 
        [10, [7,8]], // Bottom point
      ];
      
      if (filled) {
        // FILLED - Classic Red Heart
        
        // Dark outline
        ctx.fillStyle = "#880000";
        for (const [y, xArray] of heartPixels) {
          for (const x of xArray) {
            ctx.fillRect(x - 1, y, 1, 1);
            ctx.fillRect(x + 1, y, 1, 1);
            ctx.fillRect(x, y - 1, 1, 1);
            ctx.fillRect(x, y + 1, 1, 1);
          }
        }
        
        // Main heart body - Red
        ctx.fillStyle = "#ff0000";
        for (const [y, xArray] of heartPixels) {
          for (const x of xArray) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // Shine/Highlight - White
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(4, 3, 2, 1);
        ctx.fillRect(3, 4, 1, 1);
        
      } else {
        // EMPTY - Dark outline/background
        
        // Dark gray background
        ctx.fillStyle = "#222222";
        for (const [y, xArray] of heartPixels) {
          for (const x of xArray) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        
        // Outline
        ctx.fillStyle = "#555555";
        // Only draw outline pixels (edges of the heart) by drawing slightly larger rect behind or manually
         const outlinePixels: Array<[number, number[]]> = [
          [2, [4, 6, 9, 11]],
          [3, [3, 7, 8, 12]],
          [4, [2, 13]],
          [5, [2, 13]],
          [6, [3, 12]],
          [7, [4, 11]],
          [8, [5, 10]],
          [9, [6, 9]],
          [10, [7, 8]],
        ];
        for (const [y, xArray] of outlinePixels) {
          for (const x of xArray) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    return Texture.from(canvas);
  }

  private createHearts(): void {
    const spacing = 18; // 16x16 hearts with small gap

    for (let i = 0; i < this.maxHearts; i++) {
      const heart = new Sprite(this.heartFilledTexture);
      heart.x = i * spacing;
      heart.y = 0;
      // Keep original size for pixel-perfect rendering
      this.hearts.push(heart);
      this.container.addChild(heart);
    }
  }

  /** Update health display */
  update(currentHealth: number): void {
    for (let i = 0; i < this.maxHearts; i++) {
      const heart = this.hearts[i];
      if (heart) {
        heart.texture = i < currentHealth ? this.heartFilledTexture : this.heartEmptyTexture;
      }
    }
  }
}
