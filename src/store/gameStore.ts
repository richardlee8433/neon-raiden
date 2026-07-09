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
  reset: (keepHi?: boolean) => void
}

const freshPlay = {
  score: 0, graze: 0, lives: 3, bombs: 3, power: 0, laserPower: 0,
  stage: 1, phase: 'playing' as const,
  bossHp: 0, bossMaxHp: 1, bossActive: false, bossWarning: false,
}

const SOUND_KEY = 'raiden.soundEnabled'

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

export const useGameStore = create<GameState>((set, get) => ({
  ...freshPlay,
  hiScore: 0,
  phase: 'title',
  soundEnabled: loadSoundPref(),

  addScore: (n) => set((s) => {
    const score = s.score + n
    return { score, hiScore: Math.max(score, s.hiScore) }
  }),
  addGraze: () => set((s) => {
    const score = s.score + 50
    return { graze: s.graze + 1, score, hiScore: Math.max(score, s.hiScore) }
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
  setPhase: (phase) => set({ phase }),
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
  reset: (keepHi = true) => set((s) => ({
    ...freshPlay,
    hiScore: keepHi ? s.hiScore : 0,
    soundEnabled: s.soundEnabled,
  })),
}))

export const gameStore = useGameStore
