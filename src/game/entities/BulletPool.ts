import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { PLAYFIELD_LEFT, PLAYFIELD_RIGHT } from '../config'

export interface Bullet {
  sprite: Sprite
  vx: number
  vy: number
  active: boolean
  grazed: boolean  // already awarded a graze; reset on acquire
  damage: number
}

export class BulletPool {
  private pool: Bullet[] = []

  constructor(container: Container, private texture: Texture, size: number) {
    for (let i = 0; i < size; i++) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.visible = false
      container.addChild(sprite)
      this.pool.push({ sprite, vx: 0, vy: 0, active: false, grazed: false, damage: 1 })
    }
  }

  acquire(
    x: number, y: number, vx: number, vy: number,
    damage = 1, tint = 0xffffff, scale = 1, texture?: Texture,
  ): Bullet | null {
    const b = this.pool.find((b) => !b.active)
    if (!b) return null
    b.active = true
    b.grazed = false
    b.vx = vx
    b.vy = vy
    b.damage = damage
    b.sprite.x = x
    b.sprite.y = y
    b.sprite.tint = tint
    b.sprite.scale.set(scale)
    b.sprite.texture = texture ?? this.texture
    b.sprite.visible = true
    return b
  }

  release(b: Bullet) {
    b.active = false
    b.sprite.visible = false
  }

  releaseAll() {
    for (const b of this.pool) {
      if (b.active) this.release(b)
    }
  }

  /** `_stageW` is unused: bullets are culled at the combat corridor's edge,
   *  not the stage's, so they never drift into the decorative side wings. */
  update(dt: number, _stageW: number, stageH: number) {
    for (const b of this.pool) {
      if (!b.active) continue
      b.sprite.x += b.vx * dt
      b.sprite.y += b.vy * dt
      if (
        b.sprite.y < -20 || b.sprite.y > stageH + 20 ||
        b.sprite.x < PLAYFIELD_LEFT - 40 || b.sprite.x > PLAYFIELD_RIGHT + 40
      ) this.release(b)
    }
  }

  get active(): Bullet[] {
    return this.pool.filter((b) => b.active)
  }
}
