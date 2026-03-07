# AGENTS.md - Crimson Echoes Development Guide

Guidelines for AI coding agents working on Crimson Echoes, a Vampire Survivors-like roguelite.

## Project Overview

- **Engine:** PixiJS v8 (TypeScript)
- **Build:** Vite + pnpm
- **Canvas:** 480x270, scaled 2x (960x540)
- **Art Style:** 16x16 pixel art (8-bit)

See `idea_Version3.md` for the full game design document.

---

## Build/Lint/Test Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development server (localhost:3000)
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm test             # Run all tests (watch mode)
pnpm test:run         # Run tests once
pnpm test path/to/file.spec.ts   # Run single test file
pnpm test -t "pattern"           # Run tests matching pattern
pnpm typecheck        # Type check without emitting
```

---

## Project Structure

```
src/
  main.ts              # Entry point, PixiJS app init
  game/
    Game.ts            # Main game loop and state
    GameConfig.ts      # All game constants
  entities/
    Player.ts          # Movement, health, dash
    Projectile.ts      # Echo projectiles (pooled)
    Enemy.ts           # Nightling enemy
    XPOrb.ts           # Experience orbs (pooled)
  systems/
    InputSystem.ts     # Keyboard input (WASD + Space)
    EchoSystem.ts      # Auto-fire at nearest enemy
    SpawnSystem.ts     # Enemy wave management
    XPSystem.ts        # XP collection and leveling
    CollisionSystem.ts # Circle-circle hit detection
  ui/
    HealthBar.ts       # Hearts display
    Timer.ts           # Survival countdown
    XPBar.ts           # Level and progress bar
    GameOverScreen.ts  # Victory/defeat overlay
  utils/
    math.ts            # Vector math, collision helpers
    pool.ts            # Generic object pooling
    assets.ts          # Asset loading utilities
  types/
    index.ts           # Shared TypeScript types
```

---

## Code Style Guidelines

### TypeScript

- `strict: true` and `noUncheckedIndexedAccess: true` enabled
- All functions must have explicit return types
- Prefer `unknown` over `any`
- Use `as const` objects instead of enums

### Imports (use path aliases)

```typescript
import { Application } from "pixi.js";
import { GAME_CONFIG } from "@game/GameConfig";
import { Player } from "@entities/Player";
import type { Vec2, PlayerState } from "@/types";
import { distance, normalize } from "@utils/math";
```

**Path aliases:**
- `@/` → `src/`
- `@game/` → `src/game/`
- `@entities/` → `src/entities/`
- `@systems/` → `src/systems/`
- `@ui/` → `src/ui/`
- `@utils/` → `src/utils/`

### Naming Conventions

```typescript
class Player { }                    // Classes: PascalCase
interface PlayerState { }           // Interfaces: PascalCase, no "I" prefix
type GameState = "playing" | "gameover";  // Types: PascalCase
function spawnEnemy(): void { }     // Functions: camelCase, verb-first
const MAX_ENEMIES = 200;            // Constants: SCREAMING_SNAKE_CASE
private shakeTimer: number;         // Private fields: camelCase (no underscore)
```

### Formatting

- 2 spaces indentation
- Double quotes for strings
- Semicolons required
- Max line length: 100 characters

### Type Patterns

```typescript
// Interfaces for object shapes
interface Vec2 {
  x: number;
  y: number;
}

// Types for unions and computed types
type GameState = "loading" | "playing" | "gameover" | "victory";

// Result type for expected failures
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

---

## Architecture Patterns

### Object Pooling (for projectiles, enemies, XP orbs)

```typescript
const pool = new ObjectPool<Projectile>(
  () => new Projectile(),     // Create function
  (p) => p.reset(),           // Reset function
  20,                         // Initial size
  MAX_PROJECTILES             // Max size
);

const proj = pool.acquire();  // Get from pool
pool.release(proj);           // Return to pool
```

### Entity State Pattern

```typescript
// State is separate from rendering
interface EnemyState extends EntityState {
  health: number;
  speed: number;
  damage: number;
}

class Enemy {
  public state: EnemyState;
  public container: Container;  // PixiJS display object
}
```

### Game Configuration

All game constants are in `src/game/GameConfig.ts`. Change values there, not in code:

```typescript
GAME_CONFIG.PLAYER.MAX_HEALTH    // 10
GAME_CONFIG.PLAYER.SPEED         // 120 pixels/sec
GAME_CONFIG.CRIMSON_SHOT.DAMAGE  // 1
GAME_CONFIG.SURVIVAL_TIME        // 180 seconds
```

---

## Performance Guidelines

- **Projectile cap:** 100 (MVP), 500 (full game)
- **Enemy cap:** 200
- **Use object pooling** for all frequently created/destroyed objects
- **Circle-circle collision** for simple hit detection
- **Target:** 60 FPS with 200+ enemies on screen

---

## Current MVP Features

- [x] Player movement (WASD) with screen bounds
- [x] Dash ability (Space, 2s cooldown)
- [x] Crimson Shot echo (auto-aim nearest enemy)
- [x] Nightling enemy (follows player)
- [x] Enemy spawning with difficulty scaling
- [x] Collision detection (projectile↔enemy, enemy↔player)
- [x] XP orbs with magnet effect
- [x] Leveling system
- [x] Health bar, timer, XP bar UI
- [x] Game over / victory screens
- [x] Screen shake on damage

## Next Features to Implement

1. Additional echoes (Shadow Lash, Wisp Pulse)
2. Level-up choice screen (pick 1 of 3 upgrades)
3. Enemy variety (Bleak Stalker, Sanguine Bloom)
4. Boss encounter
5. Sound effects

---

## Commit Message Format

```
type(scope): short description

- Detailed change 1
- Detailed change 2
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
**Scopes:** `echo`, `enemy`, `player`, `ui`, `spawn`, `collision`, `xp`, `core`
