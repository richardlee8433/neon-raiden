import { create } from 'zustand'

interface GameState {
  score: number
  hiScore: number
  graze: number
  lives: number
  bombs: number
  power: number
  laserPower: number
  stage: number
  phase: 'title' | 'playing' | 'stageclear' | 'advancing' | 'gameover'
  bossHp: number
  bossMaxHp: number
  bossActive: boolean
  bossWarning: boolean
  soundEnabled: boolean
  paused: boolean

  addScore: (n: number) => void
  addGraze: () => void
  loseLife: () => void
  addLife: () => void
  addPower: (n: number) => void
  addLaserPower: () => void
  dropPower: () => void
  useBomb: () => boolean
  setPhase: (p: GameState['phase']) => void
  setBossHp: (hp: number, max: number) => void
  setBossActive: (v: boolean) => void
  setBossWarning: (v: boolean) => void
  advanceStage: () => void
  toggleSound: () => void
  togglePause: () => void
  reset: (keepHi?: boolean) => void
}

const freshPlay = {
  score: 0, graze: 0, lives: 3, bombs: 3, power: 0, laserPower: 0,
  stage: 1, phase: 'playing' as const,
  bossHp: 0, bossMaxHp: 1, bossActive: false, bossWarning: false,
  paused: false,
}

const SOUND_KEY = 'raiden.soundEnabled'
const HISCORE_KEY = 'raiden.hiScore'

function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

function saveSoundPref(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch { /* ignore */ }
}

function loadHiScore(): number {
  try {
    const v = parseInt(localStorage.getItem(HISCORE_KEY) ?? '0', 10)
    return Number.isFinite(v) ? v : 0
  } catch {
    return 0
  }
}

function saveHiScore(n: number) {
  try {
    localStorage.setItem(HISCORE_KEY, String(n))
  } catch { /* ignore */ }
}

export const useGameStore = create<GameState>((set, get) => ({
  ...freshPlay,
  hiScore: loadHiScore(),
  phase: 'title',
  soundEnabled: loadSoundPref(),

  addScore: (n) => set((s) => {
    const score = s.score + n
    const hiScore = Math.max(score, s.hiScore)
    if (hiScore !== s.hiScore) saveHiScore(hiScore)   // persist each new record
    return { score, hiScore }
  }),
  addGraze: () => set((s) => {
    const score = s.score + 50
    const hiScore = Math.max(score, s.hiScore)
    if (hiScore !== s.hiScore) saveHiScore(hiScore)
    return { graze: s.graze + 1, score, hiScore }
  }),
  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1) })),
  addLife: () => set((s) => ({ lives: Math.min(5, s.lives + 1) })),
  addPower: (n) => set((s) => ({ power: Math.min(4, s.power + n) })),
  addLaserPower: () => set((s) => ({ laserPower: Math.min(5, s.laserPower + 1) })),
  // death penalty: lose two weapon levels (some scatter as recoverable pickups)
  dropPower: () => set((s) => ({ power: Math.max(0, s.power - 2) })),
  useBomb: () => {
    if (get().bombs <= 0) return false
    set((s) => ({ bombs: Math.max(0, s.bombs - 1) }))
    return true
  },
  setPhase: (phase) => set((s) => {
    // Persist the record at the end of a run
    if (phase === 'gameover' || phase === 'title') saveHiScore(s.hiScore)
    return { phase, paused: false }
  }),
  setBossHp: (hp, max) => set({ bossHp: hp, bossMaxHp: max }),
  setBossActive: (v) => set({ bossActive: v }),
  setBossWarning: (v) => set({ bossWarning: v }),
  advanceStage: () => set((s) => ({
    stage: s.stage + 1,
    phase: 'advancing',
    bossActive: false,
  })),
  toggleSound: () => set((s) => {
    const soundEnabled = !s.soundEnabled
    saveSoundPref(soundEnabled)
    return { soundEnabled }
  }),
  togglePause: () => set((s) => {
    if (s.phase !== 'playing') return {}   // pausing only makes sense mid-game
    return { paused: !s.paused }
  }),
  reset: (keepHi = true) => set((s) => ({
    ...freshPlay,
    hiScore: keepHi ? s.hiScore : 0,
    soundEnabled: s.soundEnabled,
  })),
}))

export const gameStore = useGameStore
