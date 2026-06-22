# NeonRaiden

A Raiden-style vertical scrolling shooter playable in the browser.

Built with React 19, Pixi.js v8, Zustand, and TypeScript. Assets from the [Kenney Pixel Shmup](https://kenney.nl/assets/pixel-shmup) CC0 pack.

---

## How to Play

| Control | Action |
|---|---|
| Arrow Keys / WASD | Move |
| Space | Fire |
| X | Bomb |

Destroy enemies, collect power-ups, and survive all 3 stages.

---

## Stages

| Stage | Zone | Boss HP |
|---|---|---|
| 1 | Deep Space | 60 |
| 2 | Nebula Field | 80 |
| 3 | Asteroid Belt | 100 |

Each stage ends with a boss fight. Defeating the boss advances to the next stage.

---

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + Vite |
| Renderer | Pixi.js v8 |
| State | Zustand |
| Language | TypeScript |
| Assets | Kenney Pixel Shmup (CC0) |

## Architecture Highlights

- Game loop runs entirely inside Pixi ticker — React only handles the HUD overlay
- Object pooling for bullets (200 player / 500 enemy pre-allocated) and explosions
- AABB collision with grid-bucket broadphase (no O(n²) full scan)
- Wave data and boss configs are pure data in `src/game/data/stages.ts`, not hardcoded in classes
- Boss fights have multiple phases with escalating bullet patterns
