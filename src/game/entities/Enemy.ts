import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { EnemyDef } from '../data/enemies'
import { BulletPool } from './BulletPool'

export type EnemyPath = 'straight' | 'zigzag' | 'dive'

export class Enemy {
  sprite: Sprite
  hitbox: Rectangle
  active = false
  hp = 1
  scoreValue = 100

  private def!: EnemyDef
  private path: EnemyPath = 'straight'
  private age = 0
  private zigzagDir = 1
  private playerX = 240

  constructor(private container: Container, texture: Texture) {
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.sprite.visible = false
    container.addChild(this.sprite)
    this.hitbox = new Rectangle(-12, -12, 24, 24)
  }

  activate(x: number, y: number, def: EnemyDef, path: EnemyPath, playerX: number, texture: Texture) {
    this.def = def
    this.path = path
    this.hp = def.hp
    this.scoreValue = def.scoreValue
    this.age = 0
    this.playerX = playerX
    this.sprite.texture = texture
    this.sprite.x = x
    this.sprite.y = y
    this.sprite.scale.set(def.scale, -def.scale)
    this.sprite.alpha = 1
    this.sprite.visible = true
    this.active = true

    const hw = (this.sprite.width * 0.6) / 2
    const hh = (this.sprite.height * 0.6) / 2
    this.hitbox = new Rectangle(-hw, -hh, hw * 2, hh * 2)
  }

  deactivate() {
    this.active = false
    this.sprite.visible = false
  }

  get hitboxWorld(): Rectangle {
    return new Rectangle(
      this.sprite.x + this.hitbox.x,
      this.sprite.y + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    )
  }

  update(dt: number, bulletPool: BulletPool, stageH: number, playerX: number) {
    if (!this.active) return
    this.age += dt
    this.playerX = playerX

    const speed = this.def.speed

    switch (this.path) {
      case 'straight':
        this.sprite.y += speed * dt
        break
      case 'zigzag':
        this.sprite.y += speed * 0.7 * dt
        this.sprite.x += this.zigzagDir * speed * 0.8 * dt
        if (this.age % 1.2 < dt) this.zigzagDir *= -1
        break
      case 'dive': {
        const dx = this.playerX - this.sprite.x
        const dy = stageH - this.sprite.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        this.sprite.x += (dx / len) * speed * dt
        this.sprite.y += (dy / len) * speed * dt
        break
      }
    }

    // enemy fires
    if (this.def.fireRate > 0) {
      const period = this.def.fireRate
      const prev = (this.age - dt) % period
      const curr = this.age % period
      if (prev > curr) {
        bulletPool.acquire(this.sprite.x, this.sprite.y + 10, 0, this.def.bulletSpeed)
      }
    }

    // off-screen culling
    if (this.sprite.y > stageH + 40 || this.sprite.y < -200 ||
        this.sprite.x < -100 || this.sprite.x > 580) {
      this.deactivate()
    }
  }
}
