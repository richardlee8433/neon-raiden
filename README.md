# Raiden Pixel Assault

A vertical-scrolling shoot 'em up (shmup) built with React + Pixi.js v8, styled after the classic Raiden series. Playable in any modern browser — no install required.

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
| Fire | Space |
| Bomb (screen clear) | X / Shift |
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

- **Phase 1** (100–67% HP) — sweep left/right · 3-way spread
- **Phase 2** (67–33% HP) — faster sweep · 5-way spread + aimed shot
- **Phase 3** (33–0% HP) — erratic movement · 8-way spiral

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
    entities/   Player.ts           — Movement, multi-shot, invincibility frames
                Enemy.ts            — Patterns: straight/zigzag/dive/diagonal
                Boss.ts             — 3-phase boss with per-stage scaling
                BulletPool.ts       — Object pool (zero new in game loop)
                Pickup.ts           — Power/bomb drops
    systems/    InputSystem.ts      — Unified action map (keyboard)
                WaveSystem.ts       — Timed wave spawner per stage
                CollisionSystem.ts  — AABB collision
                ScrollSystem.ts     — Themed scrolling starfield (3 themes)
                AudioSystem.ts      — Web Audio synthesizer singleton
    fx/         Explosion.ts        — Frame-animation pool
                BombEffect.ts       — Screen-wide flash overlay
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
