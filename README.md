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

Survive for 6 minutes while defeating waves of enemies. Collect XP orbs to level up!

## Weapons & Upgrades

Each weapon has 3 tiers with increasingly powerful transformations:

### Directional Shot
- **Tier 1**: 4 projectiles fire in a 360° burst
- **Tier 2**: 8 projectiles for better coverage
- **Tier 3 "Orbital Nova"**: 8 projectiles orbit around the player like a solar system, then spiral outward in a swirl pattern with pulsing cyan trails

### Shotgun
- **Tier 1**: 3 projectiles in a narrow spread
- **Tier 2**: 5 projectiles in a wider spread
- **Tier 3 "Crimson Wave"**: 20 projectiles form a curved 120° wave with infinite pierce and connected visual lines

### Piercing Rounds
- **Tier 1**: Projectiles pierce through 2 enemies
- **Tier 2**: Pierce through 4 enemies with increased size and reduced speed
- **Tier 3**: Instant laser beams with infinite pierce

### Explosive Rounds
- **Tier 1**: Projectiles create small explosions on impact
- **Tier 2**: Larger explosion radius
- **Tier 3 "Meteor Storm"**: Explosions + random meteorites spawn around the player

### Additional Weapons
- **Split Shot**: Projectiles split into multiple on hit
- **Chain Lightning**: Chains between nearby enemies
- **Homing Missiles**: Projectiles track enemies

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
