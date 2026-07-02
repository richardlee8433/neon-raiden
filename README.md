# Raiden Pixel Assault

A vertical-scrolling shoot 'em up (shmup) built with React + Pixi.js v8, blending classic Raiden-style action with danmaku (bullet-hell) mechanics: a pixel-perfect hitbox, graze scoring, focus movement, and geometric bullet patterns. Playable in any modern browser — no install required.

---

## Run Locally

```bash
npm install
npm run dev
# open http://localhost:5174
```

---

## Controls

| Action | Key |
|---|---|
| Move | Arrow Keys / WASD |
| Focus (slow, shows hitbox) | Hold Shift |
| Fire | Space |
| Bomb (screen clear) | X / B |
| Mute / Unmute | M or 🔊 button |

---

## Stages

| Stage | Theme | Enemies | Boss HP |
|---|---|---|---|
| 1 — Deep Space | Dark blue starfield | Fighter · Scout · Bomber | 60 |
| 2 — Nebula Field | Purple nebula clouds | Interceptor · Gunship | 80 |
| 3 — Asteroid Belt | Red asteroid rocks | Elite · Carrier | 100 |

Each stage ends with a 3-phase boss. Bosses get faster bullet patterns and higher speed per stage.

---

## Danmaku Mechanics

**Tiny hitbox** — only a 6px point at the ship's core takes damage. Wings brushing through bullet curtains are safe; hold Shift to see the glowing hitbox dot.

**Graze** — enemy bullets passing within 22px of the hitbox without hitting award +50 points each (once per bullet), with a high-pitched tick. The HUD tracks your total graze count.

**Geometric bullet patterns** — enemy fire is choreographed with polar-coordinate emitters (`BulletPatterns.ts`):

| Pattern | Shape | Used by |
|---|---|---|
| `ring` | Evenly spaced full circle | Bomber (8-way) |
| `spiral` | Rotating arms, advances per volley | Carrier (2-arm), bosses |
| `flower` | Speed modulated by sin(petals·θ) — petal outline | Boss phase 3 |
| `aimed-fan` | Fan centered on the player | Elite (3-way), bosses |

Enemy bullets are glowing neon rounds (pink for enemies, cyan for bosses) generated procedurally, so they pop against the dark background.

---

## Power-Up System

Destroy enemies to drop **P** (power) and **B** (bomb) pickups.

| Power Level | Shots | Pattern |
|---|---|---|
| 0 | 1 | Straight up |
| 1 | 2 | ±10° spread |
| 2 | 3 | ±15° fan |
| 3 | 4 | ±8° / ±20° double pair |
| 4–5 | 5 | Full fan + max fire rate |

---

## Boss Phases

Every boss cycles through 3 phases as HP drops:

- **Phase 1** (100–67% HP) — sweep left/right · slow 14-bullet rings alternating with aimed fans
- **Phase 2** (67–33% HP) — faster sweep · 3-arm spiral with a wide aimed fan every 4th volley
- **Phase 3** (33–0% HP) — erratic movement · dense 4-arm spiral + expanding flower bursts

---

## Visual Effects

| Effect | Trigger | Detail |
|---|---|---|
| Bullet trails | Every player shot | White-hot core → yellow → orange, 22px gradient behind each bullet |
| Screen shake | Hits & explosions | Enemy kill: 1.5 · Boss hit: 3 · Boss death: 5 · Player hit: 6 · Bomb: 8 |

---

## Audio

All sound effects are synthesized live via the **Web Audio API** — zero audio files needed:

| Sound | Trigger |
|---|---|
| Laser pew | Firing |
| Explosion (small) | Enemy killed |
| Explosion (large) | Bomb / boss hit |
| Boss explosion | Boss death |
| Chime | Pickup collected |
| Rumble | Bomb detonated |
| Thud | Player hit |
| High tick | Graze (near-miss) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Rendering | Pixi.js v8 (WebGL2) |
| State | Zustand |
| Language | TypeScript |
| Assets | Kenney Pixel Shmup (CC0) |
| Audio | Web Audio API (synthesized) |

---

## Architecture

```
src/
  game/
    core/       GameApp.ts          — Pixi Application, main ticker, stage transitions
    data/       stages.ts           — Per-stage wave/boss config
                enemies.ts          — Enemy stat table
    entities/   Player.ts           — Movement, focus mode, 6px hitbox, multi-shot, i-frames
                Enemy.ts            — Move paths: straight/zigzag/dive/diagonal · fire patterns
                Boss.ts             — 3-phase danmaku boss with per-stage scaling
                BulletPool.ts       — Object pool (zero new in game loop)
                Pickup.ts           — Power/bomb drops
    systems/    InputSystem.ts      — Unified action map (keyboard + touch)
                BulletPatterns.ts   — Polar-coordinate danmaku emitters (ring/spiral/flower/fan)
                WaveSystem.ts       — Timed wave spawner per stage
                CollisionSystem.ts  — AABB collision + graze detection
                ScrollSystem.ts     — Themed scrolling starfield (3 themes)
                AudioSystem.ts      — Web Audio synthesizer singleton
    fx/         Explosion.ts        — Frame-animation pool
                BombEffect.ts       — Screen-wide flash overlay
                BulletTrail.ts      — Per-frame gradient trail behind player bullets
                GlowTexture.ts      — Procedural neon glow bullet textures
                ScreenShake.ts      — Stage offset with exponential decay
  store/        gameStore.ts        — Zustand: score, lives, power, stage, sound
  ui/           HUD.tsx             — React overlay (score/lives/boss HP bar)
                TitleScreen.tsx
                GameOverScreen.tsx
                StageClearScreen.tsx
                StageAnnouncement.tsx
  assets/       AssetLoader.ts      — Pixi Assets.load
```

**Key design rules:**
- Game loop runs entirely inside Pixi ticker — React only handles HUD overlay
- All bullets, enemies, and explosions use pre-allocated object pools
- Wave data and boss configs are pure data in `stages.ts`, not hardcoded in classes
- `gameStore` (Zustand) is the single source of truth — read via `getState()` inside the ticker

---

## License

Code: MIT · Art: [Kenney Pixel Shmup](https://kenney.nl/assets/pixel-shmup) — CC0 (public domain)
