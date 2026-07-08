export type BgTheme = 'space' | 'nebula' | 'asteroid'
export type EnemyPath = 'straight' | 'zigzag' | 'dive' | 'diagonal-left' | 'diagonal-right'
export type Formation = 'line-top' | 'line-left' | 'line-right' | 'v-shape'

export interface WaveEntry {
  time: number
  type: string
  count: number
  formation: Formation
  path: EnemyPath
}

export interface BossConfig {
  shipSprite: string   // path to ship png
  maxHp: number
  speedMult: number    // multiplier on sweep speed
  bulletSpeedMult: number
  fireRateMult: number // multiplier on fire interval (< 1 = faster)
  scoreValue: number
}

export interface StageConfig {
  id: number
  bgTheme: BgTheme
  waves: WaveEntry[]
  bossTriggerTime: number
  boss: BossConfig
}

// ─────────────────────────────────────────────────────────────
// Stage 1 — Deep Space
// ─────────────────────────────────────────────────────────────
const stage1: StageConfig = {
  id: 1,
  bgTheme: 'space',
  bossTriggerTime: 42,
  waves: [
    { time: 1,  type: 'fighter', count: 5, formation: 'line-top',   path: 'straight' },
    { time: 4,  type: 'scout',   count: 6, formation: 'line-top',   path: 'zigzag'   },
    { time: 8,  type: 'fighter', count: 4, formation: 'line-left',  path: 'dive'     },
    { time: 10, type: 'fighter', count: 4, formation: 'line-right', path: 'dive'     },
    { time: 14, type: 'bomber',  count: 3, formation: 'line-top',   path: 'straight' },
    { time: 16, type: 'scout',   count: 5, formation: 'line-top',   path: 'zigzag'   },
    { time: 20, type: 'scout',   count: 7, formation: 'v-shape',    path: 'zigzag'   },
    { time: 24, type: 'fighter', count: 4, formation: 'line-left',  path: 'diagonal-right' },
    { time: 24, type: 'fighter', count: 4, formation: 'line-right', path: 'diagonal-left'  },
    { time: 29, type: 'bomber',  count: 3, formation: 'line-top',   path: 'straight' },
    { time: 32, type: 'scout',   count: 6, formation: 'v-shape',    path: 'dive'     },
    { time: 35, type: 'fighter', count: 6, formation: 'line-top',   path: 'zigzag'   },
  ],
  boss: {
    shipSprite: './assets/kenney/Ships/ship_0015.png',
    maxHp: 60, speedMult: 1, bulletSpeedMult: 1, fireRateMult: 1, scoreValue: 5000,
  },
}

// ─────────────────────────────────────────────────────────────
// Stage 2 — Nebula Field
// ─────────────────────────────────────────────────────────────
const stage2: StageConfig = {
  id: 2,
  bgTheme: 'nebula',
  bossTriggerTime: 46,
  waves: [
    { time: 1,  type: 'interceptor', count: 6, formation: 'line-top',   path: 'straight'       },
    { time: 4,  type: 'fighter',     count: 5, formation: 'line-right',  path: 'diagonal-left'  },
    { time: 6,  type: 'fighter',     count: 5, formation: 'line-left',   path: 'diagonal-right' },
    { time: 10, type: 'gunship',     count: 2, formation: 'line-top',    path: 'straight'       },
    { time: 12, type: 'scout',       count: 6, formation: 'v-shape',     path: 'zigzag'         },
    { time: 16, type: 'interceptor', count: 6, formation: 'line-top',    path: 'dive'           },
    { time: 19, type: 'bomber',      count: 3, formation: 'line-top',    path: 'straight'       },
    { time: 22, type: 'gunship',     count: 3, formation: 'line-top',    path: 'straight'       },
    { time: 25, type: 'interceptor', count: 5, formation: 'line-right',  path: 'diagonal-left'  },
    { time: 25, type: 'interceptor', count: 5, formation: 'line-left',   path: 'diagonal-right' },
    { time: 30, type: 'scout',       count: 7, formation: 'v-shape',     path: 'zigzag'         },
    { time: 33, type: 'bomber',      count: 4, formation: 'line-top',    path: 'straight'       },
    { time: 37, type: 'interceptor', count: 7, formation: 'v-shape',     path: 'dive'           },
    { time: 41, type: 'gunship',     count: 3, formation: 'line-top',    path: 'straight'       },
  ],
  boss: {
    shipSprite: './assets/kenney/Ships/ship_0017.png',
    maxHp: 80, speedMult: 1.3, bulletSpeedMult: 1.25, fireRateMult: 0.8, scoreValue: 8000,
  },
}

// ─────────────────────────────────────────────────────────────
// Stage 3 — Asteroid Belt
// ─────────────────────────────────────────────────────────────
const stage3: StageConfig = {
  id: 3,
  bgTheme: 'asteroid',
  bossTriggerTime: 44,
  waves: [
    { time: 1,  type: 'elite',        count: 6, formation: 'line-top',   path: 'diagonal-left'  },
    { time: 3,  type: 'elite',        count: 6, formation: 'line-top',   path: 'diagonal-right' },
    { time: 6,  type: 'carrier',      count: 2, formation: 'line-top',   path: 'straight'       },
    { time: 9,  type: 'interceptor',  count: 6, formation: 'v-shape',    path: 'zigzag'         },
    { time: 12, type: 'scout',        count: 6, formation: 'line-top',   path: 'zigzag'         },
    { time: 15, type: 'carrier',      count: 3, formation: 'line-top',   path: 'straight'       },
    { time: 18, type: 'elite',        count: 5, formation: 'line-right',  path: 'diagonal-left'  },
    { time: 18, type: 'elite',        count: 5, formation: 'line-left',   path: 'diagonal-right' },
    { time: 22, type: 'gunship',      count: 4, formation: 'line-top',   path: 'straight'       },
    { time: 25, type: 'interceptor',  count: 7, formation: 'v-shape',    path: 'dive'           },
    { time: 28, type: 'bomber',       count: 4, formation: 'line-top',   path: 'straight'       },
    { time: 31, type: 'carrier',      count: 3, formation: 'line-top',   path: 'straight'       },
    { time: 34, type: 'elite',        count: 6, formation: 'line-top',   path: 'dive'           },
    { time: 37, type: 'interceptor',  count: 6, formation: 'line-top',   path: 'straight'       },
    { time: 40, type: 'carrier',      count: 3, formation: 'v-shape',    path: 'straight'       },
  ],
  boss: {
    shipSprite: './assets/kenney/Ships/ship_0019.png',
    maxHp: 100, speedMult: 1.6, bulletSpeedMult: 1.5, fireRateMult: 0.65, scoreValue: 12000,
  },
}

export const STAGES: StageConfig[] = [stage1, stage2, stage3]
