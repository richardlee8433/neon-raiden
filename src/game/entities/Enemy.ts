import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js'
import { EnemyDef } from '../data/enemies'
import { BulletPool } from './BulletPool'
import { EnemyPath } from '../data/stages'

export type { EnemyPath }

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
  private diagVx = 0
  private laserG: Graphics | null = null
  private laserTimer = 0
  private laserDuration = 0

  constructor(private container: Container, texture: Texture) {
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.sprite.visible = false
    container.addChild(this.sprite)
    this.hitbox = new Rectangle(-12, -12, 24, 24)
  }

  get activeLaser(): { x: number; fromY: number } | null {
    if (!this.def?.usesLaser || this.laserDuration <= 0) return null
    return { x: this.sprite.x, fromY: this.sprite.y }
  }

  activate(
    x: number, y: number,
    def: EnemyDef, path: EnemyPath,
    playerX: number, texture: Texture,
  ) {
    this.def = def
    this.path = path
    this.hp = def.hp
    this.scoreValue = def.scoreValue
    this.age = 0
    this.playerX = playerX
    this.laserTimer = 1 + Math.random() * 1.5  // stagger initial fire
    this.laserDuration = 0
    if (def.usesLaser && !this.laserG) {
      this.laserG = new Graphics()
      this.container.addChild(this.laserG)
    }
    this.sprite.texture = texture
    this.sprite.x = x
    this.sprite.y = y
    this.sprite.scale.set(def.scale, -def.scale)
    this.sprite.alpha = 1
    this.sprite.visible = true
    this.active = true

    // diagonal entry angle: 30° inward
    this.diagVx = path === 'diagonal-left'  ? -0.58 :   // tan(30°)
                  path === 'diagonal-right' ?  0.58 : 0

    const hw = (this.sprite.width  * 0.6) / 2
    const hh = (this.sprite.height * 0.6) / 2
    this.hitbox = new Rectangle(-hw, -hh, hw * 2, hh * 2)
  }

  deactivate() {
    this.active = false
    this.sprite.visible = false
    this.laserDuration = 0
    this.laserG?.clear()
  }

  get hitboxWorld(): Rectangle {
    return new Rectangle(
      this.sprite.x + this.hitbox.x,
      this.sprite.y + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    )
  }

  update(dt: number, bulletPool: BulletPool, stageH: number, playerX: number, playerY = 512) {
    if (!this.active) return
    this.age += dt
    this.playerX = playerX
    const spd = this.def.speed

    switch (this.path) {
      case 'straight':
        this.sprite.y += spd * dt
        break

      case 'zigzag':
        this.sprite.y += spd * 0.7 * dt
        this.sprite.x += this.zigzagDir * spd * 0.8 * dt
        if (this.age % 1.2 < dt) this.zigzagDir *= -1
        break

      case 'dive': {
        const dx = playerX - this.sprite.x
        const dy = stageH - this.sprite.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        this.sprite.x += (dx / len) * spd * dt
        this.sprite.y += (dy / len) * spd * dt
        break
      }

      case 'diagonal-left':
      case 'diagonal-right': {
        // straight down + horizontal drift; after crossing the stage switch to dive
        const halfW = 480 / 2
        if (this.sprite.y < stageH * 0.35) {
          this.sprite.y += spd * dt
          this.sprite.x += this.diagVx * spd * dt
        } else {
          const dx = playerX - this.sprite.x
          const dy = stageH * 0.7 - this.sprite.y
          const len = Math.sqrt(dx * dx + dy * dy) || 1
          this.sprite.x += (dx / len) * spd * 0.9 * dt
          this.sprite.y += (dy / len) * spd * 0.9 * dt
        }
        break
      }
    }

    // fire
    if (this.def.fireRate > 0) {
      const period = this.def.fireRate
      const prev = (this.age - dt) % period
      const curr = this.age % period
      if (prev > curr) this.fire(bulletPool, playerX, playerY)
    }

    // off-screen cull
    if (
      this.sprite.y > stageH + 60 || this.sprite.y < -200 ||
      this.sprite.x < -120 || this.sprite.x > 600
    ) { this.deactivate(); return }

    // Red laser beam (gunship only)
    if (this.def.usesLaser && this.laserG) {
      this.laserTimer -= dt
      if (this.laserTimer <= 0) {
        this.laserTimer = 2.8 + Math.random() * 0.4
        this.laserDuration = 0.55
      }
      if (this.laserDuration > 0) {
        this.laserDuration -= dt
        this.drawLaser(stageH)
      } else {
        this.laserG.clear()
      }
    }
  }

  private fire(pool: BulletPool, playerX: number, playerY: number) {
    const x = this.sprite.x
    const y = this.sprite.y + 10
    const spd = this.def.bulletSpeed

    switch (this.def.attackType) {
      case 'aimed': {
        const dx = playerX - x
        const dy = playerY - y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        pool.acquire(x, y, (dx / len) * spd, (dy / len) * spd)
        break
      }
      case 'spread': {
        const count = this.def.spreadCount ?? 3
        const halfAngle = Math.PI / 6   // ±30° from straight down
        const step = count > 1 ? (halfAngle * 2) / (count - 1) : 0
        for (let i = 0; i < count; i++) {
          const a = -halfAngle + i * step
          pool.acquire(x, y, Math.sin(a) * spd, Math.cos(a) * spd)
        }
        break
      }
      default:
        pool.acquire(x, y, 0, spd)
    }
  }

  private drawLaser(stageH: number) {
    if (!this.laserG) return
    const g = this.laserG
    const x = this.sprite.x
    const y = this.sprite.y
    const pulse = 0.82 + 0.18 * Math.sin(Date.now() * 0.028)
    g.clear()
    g.moveTo(x, y).lineTo(x, stageH).stroke({ color: 0x550000, width: 26, alpha: 0.06 * pulse })
    g.moveTo(x, y).lineTo(x, stageH).stroke({ color: 0xff2200, width: 12, alpha: 0.20 * pulse })
    g.moveTo(x, y).lineTo(x, stageH).stroke({ color: 0xff6633, width: 5,  alpha: 0.60 * pulse })
    g.moveTo(x, y).lineTo(x, stageH).stroke({ color: 0xffddcc, width: 2,  alpha: 0.95 * pulse })
    g.circle(x, y + 4, 8 + 3 * pulse).stroke({ color: 0xff4422, width: 1.5, alpha: 0.5 })
  }
}
