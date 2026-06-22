import { Container, Sprite, Texture } from 'pixi.js'

const FRAME_DURATION = 0.07  // seconds per frame
const FRAMES = 6             // tile indices used as explosion frames

interface ExplosionInstance {
  sprite: Sprite
  timer: number
  active: boolean
}

export class ExplosionPool {
  private pool: ExplosionInstance[] = []
  private textures: Texture[]

  constructor(private container: Container, textures: Texture[], poolSize = 20) {
    this.textures = textures
    for (let i = 0; i < poolSize; i++) {
      const sprite = new Sprite(textures[0])
      sprite.anchor.set(0.5)
      sprite.visible = false
      container.addChild(sprite)
      this.pool.push({ sprite, timer: 0, active: false })
    }
  }

  spawn(x: number, y: number, scale = 1.5) {
    const inst = this.pool.find((e) => !e.active)
    if (!inst) return
    inst.active = true
    inst.timer = 0
    inst.sprite.texture = this.textures[0]
    inst.sprite.x = x
    inst.sprite.y = y
    inst.sprite.scale.set(scale)
    inst.sprite.alpha = 1
    inst.sprite.visible = true
  }

  update(dt: number) {
    for (const inst of this.pool) {
      if (!inst.active) continue
      inst.timer += dt
      const frame = Math.floor(inst.timer / FRAME_DURATION)
      if (frame >= this.textures.length) {
        inst.active = false
        inst.sprite.visible = false
        continue
      }
      inst.sprite.texture = this.textures[frame]
      inst.sprite.alpha = 1 - frame / this.textures.length
    }
  }
}
