import { Container, Sprite, Texture } from 'pixi.js'

interface Particle {
  sprite: Sprite
  vx: number
  vy: number
  life: number
  active: boolean
}

const MAX_LIFE = 0.32
const EMIT_INTERVAL = 0.018

/** Glowing engine-flame particles streaming from the player's tail. */
export class EngineExhaust {
  private pool: Particle[] = []
  private emitTimer = 0

  constructor(container: Container, texture: Texture, size = 48) {
    for (let i = 0; i < size; i++) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.visible = false
      container.addChild(sprite)
      this.pool.push({ sprite, vx: 0, vy: 0, life: 0, active: false })
    }
  }

  update(dt: number, x: number, y: number, thrusting: boolean) {
    if (thrusting) {
      this.emitTimer -= dt
      while (this.emitTimer <= 0) {
        this.emitTimer += EMIT_INTERVAL
        const p = this.pool.find((p) => !p.active)
        if (!p) break
        p.active = true
        p.life = MAX_LIFE
        p.vx = (Math.random() - 0.5) * 40
        p.vy = 150 + Math.random() * 90
        p.sprite.x = x + (Math.random() - 0.5) * 8
        p.sprite.y = y + 16
        p.sprite.visible = true
      }
    }

    for (const p of this.pool) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        p.sprite.visible = false
        continue
      }
      p.sprite.x += p.vx * dt
      p.sprite.y += p.vy * dt
      const t = p.life / MAX_LIFE
      p.sprite.alpha = t
      p.sprite.scale.set(0.4 + t * 0.8)
    }
  }
}
