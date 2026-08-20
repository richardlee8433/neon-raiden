import { Container, Graphics, Sprite, Texture } from 'pixi.js'

const FRAME_DURATION = 0.07  // seconds per frame
interface ExplosionInstance {
  sprite: Sprite
  ring: Graphics
  sparks: Graphics
  timer: number
  scale: number
  spin: number
  seed: number
  active: boolean
}

export class ExplosionPool {
  private pool: ExplosionInstance[] = []
  private textures: Texture[]

  constructor(private container: Container, textures: Texture[], poolSize = 20) {
    this.textures = textures
    for (let i = 0; i < poolSize; i++) {
      const sprite = new Sprite(textures[0])
      const ring = new Graphics()
      const sparks = new Graphics()
      sprite.anchor.set(0.5)
      sprite.visible = false
      ring.visible = false
      sparks.visible = false
      container.addChild(ring, sprite, sparks)
      this.pool.push({
        sprite, ring, sparks,
        timer: 0, scale: 1, spin: 0, seed: 0, active: false,
      })
    }
  }

  spawn(x: number, y: number, scale = 1.5) {
    const inst = this.pool.find((e) => !e.active)
    if (!inst) return
    inst.active = true
    inst.timer = 0
    inst.scale = scale
    inst.spin = (Math.random() - 0.5) * 3.5
    inst.seed = Math.random() * Math.PI * 2
    inst.sprite.texture = this.textures[0]
    inst.sprite.x = x
    inst.sprite.y = y
    inst.sprite.scale.set(scale)
    inst.sprite.rotation = inst.seed
    inst.sprite.alpha = 1
    inst.sprite.visible = true
    inst.ring.visible = true
    inst.sparks.visible = true
  }

  update(dt: number) {
    for (const inst of this.pool) {
      if (!inst.active) continue
      inst.timer += dt
      const frame = Math.floor(inst.timer / FRAME_DURATION)
      if (frame >= this.textures.length) {
        inst.active = false
        inst.sprite.visible = false
        inst.ring.clear()
        inst.sparks.clear()
        inst.ring.visible = false
        inst.sparks.visible = false
        continue
      }
      inst.sprite.texture = this.textures[frame]
      const progress = inst.timer / (FRAME_DURATION * this.textures.length)
      const fade = Math.max(0, 1 - progress)
      inst.sprite.alpha = Math.min(1, fade * 1.35)
      inst.sprite.rotation += inst.spin * dt
      inst.sprite.scale.set(inst.scale * (0.82 + progress * 0.36))
      this.drawShockwave(inst, progress, fade)
    }
  }

  private drawShockwave(inst: ExplosionInstance, progress: number, fade: number) {
    const { x, y } = inst.sprite
    const radius = (5 + progress * 19) * inst.scale
    inst.ring.clear()
    inst.ring.circle(x, y, radius)
      .stroke({ color: 0xffb14a, width: Math.max(1, 2.4 * fade), alpha: 0.72 * fade })
    inst.ring.circle(x, y, radius * 0.72)
      .stroke({ color: 0xffffff, width: 1.1, alpha: 0.38 * fade })
    if (inst.scale >= 2.4) {
      inst.ring.circle(x, y, radius * 1.28)
        .stroke({ color: 0xff4a18, width: 1.5, alpha: 0.32 * fade })
    }

    inst.sparks.clear()
    const sparkCount = inst.scale >= 2.4 ? 12 : 8
    for (let i = 0; i < sparkCount; i++) {
      const a = inst.seed + i * Math.PI * 2 / sparkCount
      const stagger = 0.72 + (i % 3) * 0.14
      const outer = radius * stagger
      const inner = outer * (0.46 + progress * 0.18)
      inst.sparks.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner)
        .lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer)
        .stroke({
          color: i % 3 === 0 ? 0xffffff : i % 2 === 0 ? 0xffd25b : 0xff5a20,
          width: Math.max(0.8, 1.8 * fade),
          alpha: fade * (0.55 + (i % 2) * 0.3),
        })
    }
  }
}
