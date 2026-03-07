# "Crimson Echoes" — Game Idea (Vampire Survivors-like)

## Elevator pitch
Crimson Echoes is a minimalist, fast-loop roguelite survival game inspired by Vampire Survivors. Players control a survivor who automatically attacks while they move, facing escalating hordes of night creatures. The hook: weapon "echoes" — projectiles and powers that evolve and combine based on which other echoes are present, plus a persistent Bloodline system that reshapes each run's rules.

---

## Core loop
- Enter a map → survive waves of enemies as their numbers and intensity increase → collect experience and items → pick upgrades between levels → reach the boss / survive time limit → return to hub, spend Bloodline currency on permanent unlocks → repeat with new combos.

---

## Core features & mechanics

### Auto-combat + movement focus
- Player movement is manual; most attacks are automatic or triggered by simple conditions (proximity, timed bursts).
- Emphasize positioning, pathing through enemy clusters, and safe kiting rather than precise aiming.

### Attacks system (detailed)
This section defines how attacks work mechanically and how they interact with echoes, relics, and progression.

- Attack categories
  - Primary/Auto Projectiles: spawned constantly by echoes (bullets, bolts, shards). Core damage source for most builds.
  - Area & Zone Attacks: persistent ground effects (thorn fields, fire patches) or burst AoE centered on player/enemy.
  - Melee/Close-range: short-range lash/whip attacks with fast cooldowns for high-risk builds.
  - Turrets & Summons: stationary emitters (beacons) or allied constructs that generate their own projectiles.
  - Active Skills (player-triggered): consumable or cooldown-limited abilities (big blast, heal, phase shift).

- Targeting & behavior
  - Straight/projectile — fixed direction relative to player (fan/spread/shrapnel).
  - Homing — seeks targets within a lock radius; homing strength is a parameter (turn rate).
  - Bounce/Ricochet — projectiles reflect off walls or enemies limited number of times.
  - Area-trace/Trail — projectiles that leave persistent or temporary trails (useful for echo chaining).
  - Priority rules — when multiple targeting rules apply, use deterministic priority: Active override > Echo modifier > Global modifier > Base behavior.

- Damage model & scaling
  - Base damage (D0) per attack. Damage scales with:
    - Player level/XP: D = D0 * (1 + level * level_scale) where level_scale ≈ 0.08–0.15 depending on weapon.
    - Attack-specific multipliers from echoes/relics (additive or multiplicative; define per-modifier).
    - Critical/variance: optional small crit chance with crit multiplier.
  - Rate-of-fire and projectile count affect effective DPS; balance uses DPS and crowd-control value, not only single-hit numbers.

- Hit detection & collision
  - Projectiles use circle/rectangle hitboxes; AoE uses radius checks.
  - Friendly fire is off for player projectiles (unless a relic explicitly enables it).
  - Multiple-hit rules: some attacks pierce (hit multiple enemies), others apply a cooldown-per-target (can't hit same enemy more than N times per second).
  - Status effects (bleed, slow, stun) apply via separate checks and have durations and soft caps for stacking.

- Attack evolution & upgrades
  - Echo upgrades at level-ups: each echo can gain one of several modifiers (damage up, spread change, pierce, homing, AoE on hit).
  - Evolution: certain combinations or reaching upgrade thresholds transform an echo into a new evolved form (e.g., Crimson Shot → Crimson Barrage).
  - Upgrade examples:
    - +Damage: +X% base damage
    - +Spread → Wider fan but lower per-bullet damage
    - Pierce → Bullets penetrate up to N enemies
    - On-Hit Effect → spawn AoE/secondary projectile on hit

- Interaction & chaining rules
  - Echo synergy: when echo A modifies echo B, specify interaction type:
    - Fork: A causes B's projectiles to split on spawn/hit.
    - Trail: A leaves a trail that B's projectiles can trigger (explode, accelerate).
    - Amplify: A increases damage/rate of nearby echoes by a percentage.
  - Deterministic resolution: define an order (e.g., intrinsic echo modifiers → relic modifiers → temporary effects) to avoid ambiguous outcomes.
  - Caps & limits: to avoid runaway builds, cap multiplicative stacks or apply diminishing returns beyond thresholds.

- Resource & cooldowns
  - Active skills use charges or cooldown timers.
  - Attacks that would spawn many projectiles may consume a small resource (echo charge) or have cooldown gating.
  - Global soft cap on simultaneous projectile count with LRU culling rules (oldest player-side projectiles despawn first) to keep performance stable.

- Visual & audio feedback
  - Each attack type has distinct visual signatures (color, particle trail, impact flash) and audio cues so players can identify attack sources and interactions.
  - Echo chaining displays an overlay particle/effect showing which echoes contributed to an altered projectile.

- Balance & tuning hooks
  - Track metrics: damage per echo, kills per echo, time-to-kill standard enemy types, survival time against model waves.
  - Provide sandbox parameters for tuning: base damage, spawn rate, homing strength, lifetime, pierce count, AoE radius.

- Example attack definitions (prototype)
  - Crimson Shot: base dmg 6, rate 1.2 shots/s (per echo), spread 30°, pierce 0, speed 12.
  - Wisp Pulse: base dmg 14, homing turn rate 120°/s, lifetime 4s, spawns spectral trail every 0.75s.
  - Thorn Field: AoE ground; per-tick dmg 3, ticks every 0.5s, lifetime 6s.
  - Echo Beacon (turret): spawns nearest-projectile duplicates at 0.6x power every 1.2s.

- Example level-up choices presented to player
  - "Crimson Mastery: +25% Crimson Shot damage"
  - "Piercing Rounds: Crimson Shot gains +1 pierce"
  - "Trailing Wisp: Wisp Pulse leaves a damaging trail"
  - "Overclock Beacon: Beacon rate +30% and 10% more damage"

---

## Bloodline meta-progression
- Earn Bloodline points during runs to unlock persistent modifiers: passive stat boosts, new echoes, unique relics, or run modifiers.
- Bloodline choices can be permanent or temporary (selectable per run), enabling varied long-term experimentation.

## Relics & Artifacts
- Relics are rare, dramatic one-off items that change run rules (e.g., "Moon Shard: All projectiles spawn ghost duplicates on hit").
- Artifacts serve as mid-tier power spikes with unusual tradeoffs.

## Dynamic Difficulty & Events
- Difficulty scales with time and number of echoes. Random events (meteor showers, blood moon, cursed fog) appear periodically and change playstyle temporarily.
- Optional timed "trials" spawn that reward high-risk, high-reward payouts.

---

## Progression & Unlocks
- Start with a small pool of basic echoes and a simple character. Unlock echoes and passive bonuses via Bloodline currency.
- Unlockable characters with distinct starting echoes and passive traits.
- Seasonal/rotating challenges for limited unlocks or cosmetic rewards.

---

## Example echoes (weapons)
- Crimson Shot — spreads medium-speed bullets in a fan.
- Shadow Lash — short-range whip that cleaves.
- Wisp Pulse — slow-moving but high-damage homing orb.
- Thorn Field — ground traps that persist for seconds.
- Echo Beacon — stationary turret that duplicates nearest projectile.

Example interactions:
- Wisp Pulse + Echo Beacon → beacons generate homing pulses.
- Thorn Field + Crimson Shot → shells explode into thorns on ground contact.

---

## Example enemies & bosses
- Nightling (basic): swarm, low HP.
- Bleak Stalker: charges, briefly becomes invisible.
- Sanguine Bloom: spawns smaller creeps on death.
- Boss — The Parish Warden: multi-phase, summons mirrors that reflect echoes; weak to area control.

Design: enemies should encourage different echo builds (swarm control, single-target burst, immobilizing traps).

---

## Maps & Biomes
- Small, dense arenas with obstacles to promote movement decisions.
- Biomes: Forsaken Village (houses, tight alleys), Blood Marsh (slow movement on swamp patches), Cathedral Ruins (columns, vertical sightlines).
- Each biome introduces unique hazards and biome-specific echoes or relics.

---

## Modes
- Standard Run (survive X minutes or beat boss).
- Endless Horde (score chase).
- Challenge Runs (limited echoes, modifiers).
- Co-op (2-4 players) with shared echo interactions — combos across players create team synergies.

---

## Controls & UX
- Simple keyboard/gamepad controls: move with stick/WASD, one key for active skill (consumable), another for dash.
- Minimal HUD: health, time/wave, current echoes list, XP bar.
- Clear visual feedback for echo interactions (color/particle cues).

---

## Art & Audio direction
- Pixel-art or low-poly stylized gothic aesthetic with high-contrast lighting (neon blood accents).
- Sound design: pulsing ambient tracks, clear hit/feedback SFX, echo-specific signatures so players can identify interactions by ear.

---

## Monetization (optional)
- One-time purchase (recommended).
- Cosmetic DLCs (skins, echo visual themes).
- Season pass with cosmetic rewards and rotating challenge tracks (no pay-to-win).

---

## Prototype roadmap (MVP)
1. Minimal player with movement, one echo (basic projectile), scaling spawns.
2. Add XP, level-up choices, and two additional echoes.
3. Implement basic echo interaction rules (1–2 combos).
4. Add one biome, a small set of enemies, and a simple boss.
5. Implement Bloodline currency & a couple of persistent unlocks.
6. Playtest balance and iterate on echo synergy clarity and pacing.

---

## Balance & metrics to track
- Average run time, time to first major unlock.
- Kill sources by echo (identify overpowered echoes).
- Player deaths by time/zone (balance difficulty curve).
- Popular echo combinations (for buffs/nerfs).

---

## Unique selling points
- Echo interaction system that encourages discovery and emergent builds.
- Lightweight, fast-paced loop with strategic positioning focus.
- Bloodline meta-progression that meaningfully changes run rules, not just numbers.

---

## Next steps / To-do (for devs)
- Define a concise rule-set for echo interactions (deterministic priority rules).
- Create 8–12 core echoes with clear, distinct roles.
- Build a single playable arena and run internal playtests for feel and pacing.
- Draft UI mockups for echo list and interaction readouts.

---

Notes:
This doc is a seed — it focuses on mechanical identity and prototyping steps. If you want, I can expand specific sections (echo design table, enemy stat table, sample XP level-up choices, or a one-page design spec for the first playable build).