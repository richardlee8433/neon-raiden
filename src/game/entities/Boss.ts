import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { BulletPool } from './BulletPool'
import { BossConfig } from '../data/stages'
import { gameStore } from '../../store/gameStore'

import { STAGE_H } from '../config'

const STAGE_W = 480
const TARGET_Y = 120

export class Boss {
  sprite: Sprite
  active = false
  hp = 60
  maxHp = 60
  phase: 1 | 2 | 3 = 1

  private age = 0
  private fireTimer = 0
  private sweepDir = 1
  private state: 'entering' | 'fighting' | 'dying' = 'entering'
  private flashTimer = 0
  private spiralAngle = 0
  private cfg!: BossConfig

  constructor(private container: Container) {
    this.sprite = new Sprite()
    this.sprite.anchor.set(0.5)
    this.sprite.visible = false
    container.addChild(this.sprite)
  }

  async spawn(cfg: BossConfig) {
    this.cfg = cfg
    const tex = await new Promise<Texture>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(Texture.from(img))
      img.onerror = () => reject(new Error(`Failed to load: ${cfg.shipSprite}`))
      img.src = cfg.shipSprite
    })
    this.sprite.texture = tex

    this.active = true
    this.hp = cfg.maxHp
    this.maxHp = cfg.maxHp
    this.phase = 1
    this.state = 'entering'
    this.age = 0
    this.fireTimer = 0
    this.spiralAngle = 0
    this.sprite.scale.set(3, -3)
    this.sprite.x = STAGE_W / 2
    this.sprite.y = -80
    this.sprite.alpha = 1
    this.sprite.tint = 0xffffff
    this.sprite.visible = true

    gameStore.getState().setBossActive(true)
    gameStore.getState().setBossHp(cfg.maxHp, cfg.maxHp)
  }

  get hitboxWorld(): Rectangle {
    const hw = (this.sprite.width  * 0.4) / 2
    const hh = (this.sprite.height * 0.4) / 2
    return new Rectangle(this.sprite.x - hw, this.sprite.y - hh, hw * 2, hh * 2)
  }

  hit(damage = 1): boolean {
    if (!this.active || this.state === 'dying') return false
    this.hp -= damage
    this.flashTimer = 0.1
    this.sprite.tint = 0xff4444

    const newPhase: 1 | 2 | 3 =
      this.hp > this.maxHp * 0.67 ? 1 :
      this.hp > this.maxHp * 0.33 ? 2 : 3
    if (newPhase !== this.phase) {
      this.phase = newPhase
      this.flashTimer = 0.4
    }
    gameStore.getState().setBossHp(Math.max(0, this.hp), this.maxHp)

    if (this.hp <= 0) {
      this.state = 'dying'
      return true
    }
    return false
  }

  update(dt: number, playerX: number, bossBullets: BulletPool) {
    if (!this.active) return
    this.age += dt

    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      if (this.flashTimer <= 0) this.sprite.tint = 0xffffff
    }

    if (this.state === 'entering') {
      this.sprite.y += 80 * dt
      if (this.sprite.y >= TARGET_Y) {
        this.sprite.y = TARGET_Y
        this.state = 'fighting'
      }
      return
    }

    if (this.state === 'dying') {
      this.sprite.alpha -= dt * 1.5
      if (this.sprite.alpha <= 0) {
        this.active = false
        this.sprite.visible = false
        gameStore.getState().setBossActive(false)
        gameStore.getState().addScore(this.cfg.scoreValue)
        gameStore.getState().setPhase('stageclear')
      }
      return
    }

    // Movement
    const baseSpeed = [0, 60, 100, 140][this.phase]
    const speed = baseSpeed * this.cfg.speedMult
    this.sprite.x += this.sweepDir * speed * dt
    if (this.sprite.x > STAGE_W - 60 || this.sprite.x < 60) this.sweepDir *= -1
    if (this.phase === 3) this.sprite.y = TARGET_Y + Math.sin(this.age * 1.5) * 30

    // Fire
    const baseRates = [0, 1.5, 1.0, 0.55]
    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      this.fire(playerX, bossBullets)
      this.fireTimer = baseRates[this.phase] * this.cfg.fireRateMult
    }
  }

  private fire(playerX: number, pool: BulletPool) {
    const x = this.sprite.x
    const y = this.sprite.y + 30
    const spd = 200 * this.cfg.bulletSpeedMult

    if (this.phase === 1) {
      this.spreadShot(x, y, 3, spd, pool)
    } else if (this.phase === 2) {
      this.spreadShot(x, y, 5, spd, pool)
      const dx = playerX - x, dy = STAGE_H - y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      pool.acquire(x, y, (dx / len) * spd * 1.3, (dy / len) * spd * 1.3)
    } else {
      for (let i = 0; i < 8; i++) {
        const a = this.spiralAngle + (i * Math.PI * 2) / 8
        pool.acquire(x, y, Math.cos(a) * spd, Math.sin(a) * spd)
      }
      this.spiralAngle += 0.35
    }
  }

  private spreadShot(x: number, y: number, count: number, speed: number, pool: BulletPool) {
    const start = Math.PI / 2 - Math.PI / 4
    const step = count > 1 ? Math.PI / 2 / (count - 1) : 0
    for (let i = 0; i < count; i++) {
      const a = start + i * step
      pool.acquire(x, y, Math.cos(a) * speed, Math.sin(a) * speed)
    }
  }
}
