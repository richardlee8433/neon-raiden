import { create } from 'zustand'

interface GameState {
  score: number
  hiScore: number
  lives: number
  bombs: number
  power: number
  stage: number
  phase: 'title' | 'playing' | 'dead' | 'gameover' | 'stageclear'
  bossHp: number
  bossMaxHp: number
  bossActive: boolean

  addScore: (n: number) => void
  loseLife: () => void
  addPower: (n: number) => void
  useBomb: () => boolean
  setPhase: (p: GameState['phase']) => void
  setBossHp: (hp: number, max: number) => void
  setBossActive: (v: boolean) => void
  reset: () => void
}

const initialState = {
  score: 0, lives: 3, bombs: 3, power: 0, stage: 1,
  phase: 'title' as const,
  bossHp: 0, bossMaxHp: 1, bossActive: false,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  hiScore: 0,

  addScore: (n) => set((s) => {
    const score = s.score + n
    return { score, hiScore: Math.max(score, s.hiScore) }
  }),
  loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1) })),
  addPower: (n) => set((s) => ({ power: Math.min(5, s.power + n) })),
  useBomb: () => {
    const { bombs } = get()
    if (bombs <= 0) return false
    set((s) => ({ bombs: Math.max(0, s.bombs - 1) }))
    return true
  },
  setPhase: (phase) => set({ phase }),
  setBossHp: (hp, max) => set({ bossHp: hp, bossMaxHp: max }),
  setBossActive: (v) => set({ bossActive: v }),
  reset: () => set((s) => ({ ...initialState, hiScore: s.hiScore, phase: 'playing' })),
}))

export const gameStore = useGameStore
