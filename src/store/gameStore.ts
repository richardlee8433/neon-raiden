import { create } from 'zustand'

interface GameState {
  score: number
  hiScore: number
  lives: number
  bombs: number
  power: number
  stage: number
  phase: 'title' | 'playing' | 'stageclear' | 'advancing' | 'gameover'
  bossHp: number
  bossMaxHp: number
  bossActive: boolean
  soundEnabled: boolean

  addScore: (n: number) => void
  loseLife: () => void
  addLife: () => void
  addPower: (n: number) => void
  useBomb: () => boolean
  setPhase: (p: GameState['phase']) => void
  setBossHp: (hp: number, max: number) => void
  setBossActive: (v: boolean) => void
  advanceStage: () => void
  toggleSound: () => void
  reset: (keepHi?: boolean) => void
}

const freshPlay = {
  score: 0, lives: 3, bombs: 3, power: 0,
  stage: 1, phase: 'playing' as const,
  bossHp: 0, bossMaxHp: 1, bossActive: false,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...freshPlay,
  hiScore: 0,
  phase: 'title',
  soundEnabled: true,

  addScore: (n) => set((s) => {
    const score = s.score + n
    return { score, hiScore: Math.max(score, s.hiScore) }
  }),
  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1) })),
  addLife: () => set((s) => ({ lives: Math.min(5, s.lives + 1) })),
  addPower: (n) => set((s) => ({ power: Math.min(5, s.power + n) })),
  useBomb: () => {
    if (get().bombs <= 0) return false
    set((s) => ({ bombs: Math.max(0, s.bombs - 1) }))
    return true
  },
  setPhase: (phase) => set({ phase }),
  setBossHp: (hp, max) => set({ bossHp: hp, bossMaxHp: max }),
  setBossActive: (v) => set({ bossActive: v }),
  advanceStage: () => set((s) => ({
    stage: s.stage + 1,
    phase: 'advancing',
    bossActive: false,
  })),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  reset: (keepHi = true) => set((s) => ({
    ...freshPlay,
    hiScore: keepHi ? s.hiScore : 0,
    soundEnabled: s.soundEnabled,
  })),
}))

export const gameStore = useGameStore
