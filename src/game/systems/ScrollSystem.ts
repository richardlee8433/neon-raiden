import { Container, Graphics } from 'pixi.js'
import { BgTheme } from '../data/stages'

const BG_SPEED = 60

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface ThemeConfig {
  bgColor: number
  starPalette: number[]
  nebulaPatches?: { color: number; alpha: number }[]
  rockCount?: number
}

const THEMES: Record<BgTheme, ThemeConfig> = {
  space: {
    bgColor: 0x000011,
    starPalette: [0xffffff, 0xaaccff, 0xffffff, 0xccddff],
  },
  nebula: {
    bgColor: 0x0a0020,
    starPalette: [0xff88ff, 0xcc66ff, 0x88aaff, 0xffaaff, 0xffffff],
    nebulaPatches: [
      { color: 0x6600aa, alpha: 0.08 },
      { color: 0xaa0066, alpha: 0.06 },
      { color: 0x4400cc, alpha: 0.07 },
    ],
  },
  asteroid: {
    bgColor: 0x050005,
    starPalette: [0xff8844, 0xffaa66, 0xff6622, 0xffcc88, 0xffffff],
    nebulaPatches: [
      { color: 0x441100, alpha: 0.12 },
      { color: 0x220800, alpha: 0.09 },
    ],
    rockCount: 18,
  },
}

function buildLayer(
  stageW: number, stageH: number,
  config: ThemeConfig, seed: number,
): Graphics {
  const rng = mulberry32(seed)
  const g = new Graphics()

  g.rect(0, 0, stageW, stageH).fill({ color: config.bgColor })

  // Nebula / dust clouds
  if (config.nebulaPatches) {
    for (const patch of config.nebulaPatches) {
      const cx = rng() * stageW
      const cy = rng() * stageH
      const rx = 80 + rng() * 120
      const ry = 50 + rng() * 80
      g.ellipse(cx, cy, rx, ry).fill({ color: patch.color, alpha: patch.alpha })
    }
  }

  // Asteroid rocks (dark jagged circles)
  if (config.rockCount) {
    for (let i = 0; i < config.rockCount; i++) {
      const rx = rng() * stageW
      const ry = rng() * stageH
      const r  = 4 + rng() * 18
      g.circle(rx, ry, r).fill({ color: 0x221108, alpha: 0.6 + rng() * 0.3 })
    }
  }

  // Stars — small squares in one batch per color
  const palette = config.starPalette
  for (let ci = 0; ci < palette.length; ci++) {
    const count = ci === 0 ? 70 : 15
    for (let i = 0; i < count; i++) {
      const x = rng() * stageW
      const y = rng() * stageH
      const s = rng() < 0.12 ? 2 : 1
      g.rect(x, y, s, s)
    }
    g.fill({ color: palette[ci], alpha: 0.5 + rng() * 0.5 })
  }

  return g
}

export class ScrollSystem {
  private layers: Graphics[] = []
  private tileH: number
  private container: Container
  private stageW: number
  private stageH: number

  constructor(container: Container, stageW: number, stageH: number, theme: BgTheme = 'space') {
    this.container = container
    this.stageW = stageW
    this.stageH = stageH
    this.tileH = stageH
    this.buildTheme(theme)
  }

  setTheme(theme: BgTheme) {
    for (const layer of this.layers) this.container.removeChild(layer)
    this.layers = []
    this.buildTheme(theme)
  }

  private buildTheme(theme: BgTheme) {
    const cfg = THEMES[theme]
    const l0 = buildLayer(this.stageW, this.stageH, cfg, 42)
    const l1 = buildLayer(this.stageW, this.stageH, cfg, 99)
    l0.y = 0
    l1.y = -this.stageH
    this.container.addChildAt(l0, 0)
    this.container.addChildAt(l1, 1)
    this.layers = [l0, l1]
  }

  update(dt: number) {
    for (const layer of this.layers) {
      layer.y += BG_SPEED * dt
      if (layer.y >= this.tileH) layer.y -= this.tileH * 2
    }
  }
}
