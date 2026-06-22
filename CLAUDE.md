# CLAUDE.md — Raiden-style Shmup

## Project overview

縱向卷軸射擊遊戲，風格參考雷電系列。瀏覽器可玩，使用 Kenney Pixel Shmup 素材包。

## Tech stack

| 層次 | 技術 |
|---|---|
| 框架 | React 19 + Vite |
| 渲染 | Pixi.js v8 |
| 狀態 | Zustand |
| 語言 | TypeScript |
| 素材 | Kenney Pixel Shmup (CC0) |

## Folder structure

```
src/
  game/
    core/
      GameApp.ts        # Pixi.Application 初始化、主 ticker
      SceneManager.ts   # title | game | gameover 場景切換
    systems/
      InputSystem.ts    # keyboard + touch 輸入，統一 action map
      CollisionSystem.ts# AABB 碰撞，broadphase bucket
      WaveSystem.ts     # 波次定義、敵機生成排程
      ScrollSystem.ts   # 背景視差捲動
    entities/
      Player.ts         # 移動、射擊、無敵幀、hitbox
      Enemy.ts          # 基底類，子類覆寫 pattern()
      BulletPool.ts     # object pool，玩家 + 敵機子彈分開
      Pickup.ts         # power-up、bomb、1up
      Boss.ts           # 多階段 HP、phase 切換
    fx/
      Explosion.ts      # sprite animation pool
      ScreenShake.ts    # camera offset
    data/
      waves.ts          # 所有波次資料 (純 JSON)
      enemies.ts        # 敵機屬性表
      stages.ts         # 關卡定義
  store/
    gameStore.ts        # Zustand: score, lives, power, stage, phase
  assets/
    AssetLoader.ts      # Pixi Assets.load，sprite sheet 解析
  ui/
    HUD.tsx             # score / lives / power bar (React overlay)
    TitleScreen.tsx
    GameOverScreen.tsx
  App.tsx               # canvas ref + React UI overlay
```

## Architecture rules

### Game loop
- 所有遊戲邏輯在 Pixi ticker 內執行，**不使用 React state 驅動遊戲物件**
- React 只負責 HUD overlay，透過 Zustand subscribe 更新
- ticker callback 順序：Input → Update → Collision → Render

### Object pooling (強制)
- `BulletPool`、`Explosion` 必須用 pool，禁止在 ticker 內 `new`
- pool 預熱：遊戲開始前 pre-allocate 200 顆玩家子彈、500 顆敵機子彈
- 回收條件：出畫面或命中，呼叫 `pool.release(obj)` 而非 destroy

### Collision
- 使用 AABB（軸對齊矩形），不用 pixel-perfect
- hitbox 比 sprite 小 20-30%（視覺寬容）
- broadphase：把畫面切成 grid bucket，只檢查同 bucket 內的物件

### Input
```ts
// InputSystem 輸出統一 action，不直接讀 keyCode
interface Actions {
  moveX: number   // -1 | 0 | 1
  moveY: number   // -1 | 0 | 1
  fire: boolean
  bomb: boolean
}
```
- 同時支援 WASD / 方向鍵 / 觸控虛擬搖桿

### Entity pattern
```ts
abstract class Entity {
  sprite: Sprite
  hitbox: Rectangle
  active: boolean
  abstract update(dt: number): void
  abstract onHit(): void
}
```

### Wave data format
```ts
// src/game/data/waves.ts
export const waves: Wave[] = [
  {
    time: 0,          // 出現時間（秒）
    type: 'fighter',  // 對應 enemies.ts 的 key
    count: 5,
    formation: 'line-top',   // 預設隊形
    path: 'zigzag',          // 移動路徑
  }
]
```

## Asset loading

```ts
// AssetLoader.ts
await Assets.load([
  { alias: 'ships',      src: '/assets/kenney/Ships.png' },
  { alias: 'ships-data', src: '/assets/kenney/Ships.json' },
  { alias: 'bullets',    src: '/assets/kenney/Tiles.png' },
  { alias: 'explosion',  src: '/assets/kenney/Explosion.png' },
  { alias: 'bg-space',   src: '/assets/kenney/BackgroundBlack.png' },
])
```

Kenney 素材放在 `public/assets/kenney/`，不要放 `src/` 內。

## Zustand store shape

```ts
interface GameState {
  // 遊戲資料
  score: number
  hiScore: number
  lives: number
  bombs: number
  power: number        // 0-5，影響武器等級
  stage: number
  phase: 'title' | 'playing' | 'dead' | 'gameover' | 'stageclear'

  // Actions
  addScore: (n: number) => void
  loseLife: () => void
  addPower: (n: number) => void
  useBomb: () => void
  setPhase: (p: GameState['phase']) => void
}
```

## Scroll & background

- 背景用兩張相同圖片首尾相接，Y 軸持續往下移動形成無限捲動
- 視差：背景層速度 = 玩家速度 × 0.3
- 前景地形（地面）速度 = 玩家速度 × 1.0

## Enemy AI patterns

每個 Enemy 子類實作 `pattern(dt)` 方法：

```
straight     → 直線向下
zigzag       → 左右交替
dive         → 鎖定玩家角度俯衝
formation    → 保持隊形移動
boss-orbit   → Boss 繞中心點旋轉
```

## Boss design

- 多階段：每個 phase 有獨立 HP 條、彈幕模式、移動模式
- `phase` 切換時播放短暫閃白動畫
- 必須有明確的弱點部位（hitbox 縮小到 Boss sprite 中心 30%）

## HUD layout

```
┌─────────────────────────┐
│ SCORE: 000000  HI: 999999│  ← React overlay，position: absolute
│ ♥♥♥  💣💣  [====]POWER │
└─────────────────────────┘
```

- HUD 用 CSS，不要在 Pixi canvas 上畫文字
- power bar 用 CSS `width` transition，不用 Pixi Graphics

## Performance targets

| 指標 | 目標 |
|---|---|
| FPS | 60 穩定 |
| 最大子彈數 | 500 顆同時存在 |
| 最大敵機數 | 50 隻同時存在 |
| 爆炸特效 | 20 個同時播放 |

## Do / Don't

### Do
- 所有數值（速度、HP、傷害）集中在 `data/` 資料夾，不寫死在 class 內
- 每個 system 職責單一，互相透過 store 或 event emitter 通訊
- 子彈、敵機出畫面立刻回收
- 無敵幀（invincibility frames）玩家被擊中後 2 秒

### Don't
- 不在 ticker 內操作 React state（setScore 等）→ 用 Zustand getState()
- 不用 setTimeout / setInterval 做遊戲計時 → 用 ticker delta
- 不讓碰撞檢測跑 O(n²) 全體配對 → 用 bucket
- 不在 update loop 內 console.log

## First session checklist

Claude Code 第一個 session 目標（依序）：

- [ ] Vite + React + TypeScript 專案初始化
- [ ] 安裝 pixi.js@^8、zustand
- [ ] `GameApp.ts`：Pixi Application 掛上 canvas ref
- [ ] `AssetLoader.ts`：載入 Kenney sprite sheet，console 確認成功
- [ ] `Player.ts`：飛機出現在畫面中央，方向鍵移動，限制在畫面內
- [ ] `BulletPool.ts`：空白鍵射擊，子彈向上飛，出畫面回收
- [ ] `ScrollSystem.ts`：太空背景無限捲動
- [ ] 確認 60fps 穩定後才進入敵機開發
