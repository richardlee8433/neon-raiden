import { Container, Graphics } from 'pixi.js'

const BG_SPEED = 60

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeStarfield(stageW: number, stageH: number, seed: number): Graphics {
  const rng = mulberry32(seed)
  const g = new Graphics()

  // Single background rect
  g.rect(0, 0, stageW, stageH).fill({ color: 0x000011 })

  // All small stars in one batch (white)
  for (let i = 0; i < 80; i++) {
    const x = rng() * stageW
    const y = rng() * stageH
    g.rect(x, y, 1, 1)
  }
  g.fill({ color: 0xffffff, alpha: 0.6 })

  // Bright stars in a second batch
  for (let i = 0; i < 20; i++) {
    const x = rng() * stageW
    const y = rng() * stageH
    g.rect(x, y, 2, 2)
  }
  g.fill({ color: 0xaaccff, alpha: 0.9 })

  return g
}

export class ScrollSystem {
  private layers: Graphics[]
  private tileH: number

  constructor(container: Container, stageW: number, stageH: number) {
    this.tileH = stageH
    this.layers = [
      makeStarfield(stageW, stageH, 42),
      makeStarfield(stageW, stageH, 99),
    ]
    this.layers[0].y = 0
    this.layers[1].y = -stageH
    container.addChild(this.layers[0], this.layers[1])
  }

  update(dt: number) {
    for (const layer of this.layers) {
      layer.y += BG_SPEED * dt
      if (layer.y >= this.tileH) {
        layer.y -= this.tileH * 2
      }
    }
  }
}
