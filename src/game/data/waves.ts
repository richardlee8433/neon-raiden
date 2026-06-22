export interface WaveEntry {
  time: number
  type: string
  count: number
  formation: 'line-top' | 'line-left' | 'line-right' | 'v-shape'
  path: 'straight' | 'zigzag' | 'dive'
}

export const waves: WaveEntry[] = [
  { time: 1,  type: 'fighter', count: 4, formation: 'line-top',   path: 'straight' },
  { time: 5,  type: 'scout',   count: 5, formation: 'line-top',   path: 'zigzag'   },
  { time: 10, type: 'fighter', count: 3, formation: 'line-left',  path: 'dive'     },
  { time: 13, type: 'fighter', count: 3, formation: 'line-right', path: 'dive'     },
  { time: 18, type: 'bomber',  count: 3, formation: 'line-top',   path: 'straight' },
  { time: 24, type: 'scout',   count: 6, formation: 'v-shape',    path: 'zigzag'   },
  { time: 30, type: 'bomber',  count: 2, formation: 'line-top',   path: 'straight' },
  { time: 33, type: 'fighter', count: 5, formation: 'line-top',   path: 'zigzag'   },
]
