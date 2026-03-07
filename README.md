# Crimson Echoes

A Vampire Survivors-like roguelite survival game built with PixiJS and TypeScript.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open http://localhost:3000 to play!

## Controls

- **WASD** or **Arrow Keys**: Move
- **Space**: Dash (2 second cooldown)

## Game Goal

Survive for 3 minutes while defeating waves of enemies. Collect XP orbs to level up!

## Downloading Assets (Optional)

The game works with placeholder graphics, but for better visuals you can download the free Ninja Adventure asset pack:

1. Go to https://pixel-boy.itch.io/ninja-adventure-asset-pack
2. Download the free asset pack (CC0 license)
3. Extract to `public/assets/ninja-adventure/`
4. Update the asset paths in `src/utils/assets.ts`

## Project Structure

```
src/
  main.ts              # Entry point
  game/
    Game.ts            # Main game loop
    GameConfig.ts      # Constants and configuration
  entities/
    Player.ts          # Player movement and health
    Projectile.ts      # Echo projectiles
    Enemy.ts           # Nightling enemies
    XPOrb.ts           # Experience orbs
  systems/
    InputSystem.ts     # Keyboard handling
    EchoSystem.ts      # Auto-fire projectiles
    SpawnSystem.ts     # Enemy wave spawning
    XPSystem.ts        # Experience and leveling
    CollisionSystem.ts # Hit detection
  ui/
    HealthBar.ts       # Hearts display
    Timer.ts           # Survival countdown
    XPBar.ts           # Level and XP progress
    GameOverScreen.ts  # Victory/defeat screen
  utils/
    math.ts            # Vector math utilities
    pool.ts            # Object pooling
    assets.ts          # Asset loading
  types/
    index.ts           # TypeScript types
```

## Scripts

```bash
pnpm dev        # Development server
pnpm build      # Production build
pnpm preview    # Preview production build
pnpm test       # Run tests
pnpm typecheck  # Type check without build
```

## Tech Stack

- **Engine**: PixiJS v8
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **Testing**: Vitest
