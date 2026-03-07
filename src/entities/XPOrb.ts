// =============================================================================
// XP Orb Entity
// =============================================================================

import { Container, Graphics } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import type { XPOrbState, Vec2 } from "@/types";
import { distance, normalize, subtract } from "@utils/math";

export class XPOrb {
  public state: XPOrbState;
  public container: Container;
  private graphics: Graphics;
  private bobTimer: number = 0;
  private baseY: number = 0;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      active: false,
      value: 1,
      magnetized: false,
    };

    this.container = new Container();
    this.graphics = this.createOrbGraphics();
    this.container.addChild(this.graphics);
    this.container.visible = false;
  }

  private createOrbGraphics(): Graphics {
    const g = new Graphics();
    const size = GAME_CONFIG.XP.ORB_SIZE; // Now 5 pixels
    const radius = size; // Make it bigger - use full size as radius
    
    // GREEN BALL
    
    // Outer glow (darker green)
    g.fill(0x00AA00); // Dark Green
    g.circle(0, 0, radius + 1);
    
    // Main body - Bright Green
    g.fill(0xA0D585); // Bright Green
    g.circle(0, 0, radius);
    
    // Shine/Highlight - Lighter green
    g.fill(0xAAFF00); // Yellow-Green highlight
    g.circle(-radius/3, -radius/3, radius/2);

    return g;
  }

  /** Activate orb at position */
  activate(x: number, y: number, value: number): void {
    this.state.position.x = x;
    this.state.position.y = y;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    this.state.value = value;
    this.state.active = true;
    this.state.magnetized = false;
    this.bobTimer = Math.random() * Math.PI * 2; // Random start phase
    this.baseY = y;
    this.container.visible = true;
    this.updatePosition();
  }

  /** Deactivate orb */
  deactivate(): void {
    this.state.active = false;
    this.container.visible = false;
  }

  /** Update orb - move toward player if magnetized */
  update(dt: number, playerPos: Vec2): boolean {
    if (!this.state.active) return false;

    // Bob animation
    this.bobTimer += dt * 4;
    const bobOffset = Math.sin(this.bobTimer) * 2;

    // Check if within magnet range
    const dist = distance(this.state.position, playerPos);

    if (dist < GAME_CONFIG.XP.MAGNET_RANGE) {
      this.state.magnetized = true;
    }

    // Move toward player when magnetized
    if (this.state.magnetized) {
      const direction = normalize(subtract(playerPos, this.state.position));
      const speed = GAME_CONFIG.XP.MAGNET_SPEED;

      this.state.position.x += direction.x * speed * dt;
      this.state.position.y += direction.y * speed * dt;
      this.baseY = this.state.position.y;

      // Check collection
      if (dist < 8) {
        this.deactivate();
        return true; // Collected
      }
    }

    // Update visual position with bob effect
    this.container.x = this.state.position.x;
    this.container.y = this.baseY + bobOffset;

    // Pulse effect when magnetized
    if (this.state.magnetized) {
      this.graphics.rotation += dt * 10;
      const pulse = 1 + Math.sin(this.bobTimer * 2) * 0.1;
      if (this.graphics.scale) {
        this.graphics.scale.x = pulse;
        this.graphics.scale.y = pulse;
      }
    }

    return false;
  }

  private updatePosition(): void {
    this.container.x = this.state.position.x;
    this.container.y = this.state.position.y;
  }

  /** Reset for pooling */
  reset(): void {
    this.state.active = false;
    this.state.magnetized = false;
    this.container.visible = false;
    this.graphics.rotation = 0;
    if (this.graphics.scale) {
      this.graphics.scale.x = 1;
      this.graphics.scale.y = 1;
    }
  }
}
