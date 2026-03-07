// =============================================================================
// XP System - Experience and leveling
// =============================================================================

import { Container } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { XPOrb } from "@entities/XPOrb";
import { ObjectPool } from "@utils/pool";
import type { Vec2, ProgressionState } from "@/types";

export class XPSystem {
  private orbPool: ObjectPool<XPOrb>;
  private container: Container;
  private state: ProgressionState;
  private pendingLevelUps: number = 0;

  constructor(parentContainer: Container) {
    this.container = new Container();
    parentContainer.addChild(this.container);

    this.state = {
      xp: 0,
      level: 1,
      xpToNextLevel: GAME_CONFIG.XP.LEVELS[1] ?? 10,
    };

    // Initialize orb pool
    this.orbPool = new ObjectPool<XPOrb>(
      () => {
        const orb = new XPOrb();
        this.container.addChild(orb.container);
        return orb;
      },
      (orb) => orb.reset(),
      50, // Initial pool size
      500
    );
  }

  /** Spawn an XP orb at position */
  spawnOrb(x: number, y: number, value: number): void {
    const orb = this.orbPool.acquire();
    orb.activate(x, y, value);
  }

  /** Update all orbs and check collection */
  update(dt: number, playerPos: Vec2): void {
    for (const orb of this.orbPool.getActive()) {
      if (orb.update(dt, playerPos)) {
        // Orb was collected
        this.addXP(orb.state.value);
        this.orbPool.release(orb);
      }
    }
  }

  /** Add XP and check for level up */
  addXP(amount: number): void {
    this.state.xp += amount;

    // Check for level up
    while (this.state.xp >= this.state.xpToNextLevel) {
      this.levelUp();
    }
  }

  /** Level up */
  private levelUp(): void {
    this.state.level++;

    // Get XP requirement for next level
    const levels = GAME_CONFIG.XP.LEVELS;
    if (this.state.level < levels.length) {
      this.state.xpToNextLevel = levels[this.state.level] ?? this.state.xpToNextLevel * 1.5;
    } else {
      // Beyond defined levels, use exponential scaling
      this.state.xpToNextLevel = Math.floor(this.state.xpToNextLevel * 1.5);
    }

    console.log(`Level up! Now level ${this.state.level}`);
    this.pendingLevelUps++;
  }

  /** Get and clear pending level ups */
  consumeLevelUp(): boolean {
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--;
      return true;
    }
    return false;
  }

  /** Get current progression state */
  getState(): Readonly<ProgressionState> {
    return this.state;
  }

  /** Get XP progress toward next level (0-1) */
  getProgress(): number {
    const currentLevelXP = this.state.level > 1 
      ? (GAME_CONFIG.XP.LEVELS[this.state.level - 1] ?? 0)
      : 0;
    const xpIntoLevel = this.state.xp - currentLevelXP;
    const xpNeeded = this.state.xpToNextLevel - currentLevelXP;
    return Math.min(1, Math.max(0, xpIntoLevel / xpNeeded));
  }

  /** Get orb count */
  get orbCount(): number {
    return this.orbPool.activeCount;
  }

  /** Reset system */
  reset(): void {
    this.orbPool.releaseAll();
    this.state.xp = 0;
    this.state.level = 1;
    this.state.xpToNextLevel = GAME_CONFIG.XP.LEVELS[1] ?? 10;
    this.pendingLevelUps = 0;
  }
}
