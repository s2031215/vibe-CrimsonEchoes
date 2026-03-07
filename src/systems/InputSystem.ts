// =============================================================================
// Input System - Keyboard handling
// =============================================================================

import type { InputState } from "@/types";

export class InputSystem {
  private state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    dashPressed: false,
    levelUpCheat: false,
    levelUpCheatPressed: false,
  };

  private previousDash: boolean = false;
  private previousLevelUpCheat: boolean = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
    window.addEventListener("blur", this.handleBlur.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.updateKey(event.code, true);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.updateKey(event.code, false);
  }

  private handleBlur(): void {
    // Reset all keys when window loses focus
    this.state.up = false;
    this.state.down = false;
    this.state.left = false;
    this.state.right = false;
    this.state.dash = false;
    this.state.levelUpCheat = false;
  }

  private updateKey(code: string, pressed: boolean): void {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.state.up = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        this.state.down = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.state.left = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        this.state.right = pressed;
        break;
      case "Space":
        this.state.dash = pressed;
        break;
      case "KeyU":
        this.state.levelUpCheat = pressed;
        break;
    }
  }

  /** Update input state - call once per frame */
  update(): void {
    // Detect dash press edge (just pressed this frame)
    this.state.dashPressed = this.state.dash && !this.previousDash;
    this.previousDash = this.state.dash;

    // Detect level up cheat press edge (just pressed this frame)
    this.state.levelUpCheatPressed = this.state.levelUpCheat && !this.previousLevelUpCheat;
    this.previousLevelUpCheat = this.state.levelUpCheat;
  }

  /** Get current input state */
  getState(): Readonly<InputState> {
    return this.state;
  }

  /** Get movement direction as normalized vector */
  getMovementDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.state.left) x -= 1;
    if (this.state.right) x += 1;
    if (this.state.up) y -= 1;
    if (this.state.down) y += 1;

    // Normalize diagonal movement
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) {
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  /** Cleanup listeners */
  destroy(): void {
    window.removeEventListener("keydown", this.handleKeyDown.bind(this));
    window.removeEventListener("keyup", this.handleKeyUp.bind(this));
    window.removeEventListener("blur", this.handleBlur.bind(this));
  }
}
