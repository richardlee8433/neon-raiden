import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { BulletPool } from './BulletPool'
import { BossConfig } from '../data/stages'
import { gameStore } from '../../store/gameStore'
import { fireRing, fireFlower, fireAimedFan } from '../systems/BulletPatterns'
import { ExplosionPool } from '../fx/Explosion'
import { BombEffect } from '../fx/BombEffect'
import { screenShake } from '../fx/ScreenShake'
import { hitstop } from '../fx/Hitstop'
import { audioSystem } from '../systems/AudioSystem'

import { PLAYFIELD_LEFT, PLAYFIELD_RIGHT, PLAYFIELD_W, SPRITE_SCALE } from '../config'

const TARGET_Y = 120
const PLAYFIELD_CENTER = PLAYFIELD_LEFT + PLAYFIELD_W / 2
const TOP_MARGIN = 20
const ENTER_DURATION = 2.5

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
  private spiralAngle2 = 0   // counter-rotating arm for the stage-2 helix
  private shotIndex = 0
  private bossId = 1
  private dyingTimer = 0
  private chainTimer = 0
  private finaleDone = false
  private targetY = TARGET_Y
  private enterSpeed = 80
  private cfg!: BossConfig

  constructor(private container: Container) {
    this.sprite = new Sprite()
    this.sprite.anchor.set(0.5)
    this.sprite.visible = false
    container.addChild(this.sprite)
  }

  async spawn(cfg: BossConfig, bossId = 1) {
    this.cfg = cfg
    this.bossId = bossId
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
    this.spiralAngle2 = 0
    this.shotIndex = 0
    this.dyingTimer = 0
    this.chainTimer = 0
    this.finaleDone = false
    const k = (cfg.displayW * SPRITE_SCALE) / tex.width
    this.sprite.scale.set(k, cfg.flipY ? -k : k)
    // Tall hulls would hang off the top edge at the default hover height.
    this.targetY = Math.max(TARGET_Y, (tex.height * k) / 2 + TOP_MARGIN)
    this.sprite.x = PLAYFIELD_CENTER
    this.sprite.y = -(tex.height * k) / 2 - TOP_MARGIN
    // Fixed-duration entrance: a taller hull starts further off-screen, so a
    // fixed speed would leave the big bosses crawling in.
    this.enterSpeed = (this.targetY - this.sprite.y) / ENTER_DURATION
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

  update(
    dt: number, playerX: number, playerY: number,
    bossBullets: BulletPool,
    explosions: ExplosionPool, flash: BombEffect,
  ) {
    if (!this.active) return
    this.age += dt

    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      if (this.flashTimer <= 0) this.sprite.tint = 0xffffff
    }

    if (this.state === 'entering') {
      this.sprite.y += this.enterSpeed * dt
      if (this.sprite.y >= this.targetY) {
        this.sprite.y = this.targetY
        this.state = 'fighting'
      }
      return
    }

    // Death spectacle: shudder + chain explosions, then a white-out finale
    if (this.state === 'dying') {
      this.dyingTimer += dt
      if (!this.finaleDone) {
        this.sprite.x += (Math.random() - 0.5) * 6
        this.chainTimer -= dt
        if (this.chainTimer <= 0) {
          this.chainTimer = 0.12
          const ox = (Math.random() - 0.5) * this.sprite.width * 0.8
          const oy = (Math.random() - 0.5) * this.sprite.height * 0.8
          explosions.spawn(this.sprite.x + ox, this.sprite.y + oy, 1.2 + Math.random())
          audioSystem.playExplosion('small')
          screenShake.trigger(2)
        }
        if (this.dyingTimer >= 1.5) {
          this.finaleDone = true
          this.sprite.visible = false
          explosions.spawn(this.sprite.x, this.sprite.y, 5)
          flash.trigger()
          hitstop.trigger(0.35)
          screenShake.trigger(12)
          audioSystem.playExplosion('boss')
        }
      } else if (this.dyingTimer >= 2.2) {
        this.active = false
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
    // Turn on the hull's own edge, not a fixed margin — a wide hull would
    // otherwise sweep a third of itself off the side of the field.
    const halfW = Math.min(this.sprite.width / 2, PLAYFIELD_W / 2 - 20)
    if (this.sprite.x > PLAYFIELD_RIGHT - halfW || this.sprite.x < PLAYFIELD_LEFT + halfW) this.sweepDir *= -1
    if (this.phase === 3) this.sprite.y = this.targetY + Math.sin(this.age * 1.5) * 30

    // Fire — per-boss cadence per phase
    const RATES: Record<number, number[]> = {
      1: [0, 1.5, 0.5, 0.32],
      2: [0, 0.5, 0.42, 0.3],
      3: [0, 1.0, 0.5, 0.4],
    }
    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      this.fire(playerX, playerY, bossBullets)
      this.fireTimer = (RATES[this.bossId] ?? RATES[1])[this.phase] * this.cfg.fireRateMult
    }
  }

  private fire(playerX: number, playerY: number, pool: BulletPool) {
    this.shotIndex++
    switch (this.bossId) {
      case 2:  this.fireHelix(playerX, playerY, pool); break
      case 3:  this.fireBloom(playerX, playerY, pool); break
      default: this.fireGatekeeper(playerX, playerY, pool)
    }
  }

  // ── Boss 1 "Gatekeeper" — the teacher: readable rings + aimed fans ──────
  private fireGatekeeper(playerX: number, playerY: number, pool: BulletPool) {
    const x = this.sprite.x
    const y = this.sprite.y + 30
    const spd = 200 * this.cfg.bulletSpeedMult

    if (this.phase === 1) {
      if (this.shotIndex % 2 === 1) {
        fireRing(pool, x, y, spd * 0.85, 14, this.spiralAngle)
        this.spiralAngle += 0.4
      } else {
        fireAimedFan(pool, x, y, spd * 1.15, 3, 0.42, playerX, playerY)
      }
    } else if (this.phase === 2) {
      fireRing(pool, x, y, spd * 0.9, 3, this.spiralAngle)
      this.spiralAngle += 0.5
      if (this.shotIndex % 4 === 0) {
        fireAimedFan(pool, x, y, spd * 1.25, 5, 0.7, playerX, playerY)
      }
    } else {
      fireRing(pool, x, y, spd * 0.95, 4, this.spiralAngle)
      this.spiralAngle += 0.3
      if (this.shotIndex % 6 === 0) {
        fireFlower(pool, x, y, spd * 0.8, 20, 5, this.spiralAngle)
      }
    }
  }

  // ── Boss 2 "Twin Helix" — counter-rotating spirals weave a lattice ──────
  private fireHelix(playerX: number, playerY: number, pool: BulletPool) {
    const x = this.sprite.x
    const y = this.sprite.y + 30
    const spd = 200 * this.cfg.bulletSpeedMult

    if (this.phase === 1) {
      fireRing(pool, x, y, spd * 0.9, 2, this.spiralAngle)
      this.spiralAngle += 0.45
    } else if (this.phase === 2) {
      fireRing(pool, x, y, spd * 0.9, 3, this.spiralAngle)
      fireRing(pool, x, y, spd * 0.75, 3, this.spiralAngle2)
      this.spiralAngle  += 0.45
      this.spiralAngle2 -= 0.32   // opposite spin → moving lattice
    } else {
      fireRing(pool, x, y, spd * 0.95, 4, this.spiralAngle)
      fireRing(pool, x, y, spd * 0.78, 4, this.spiralAngle2)
      this.spiralAngle  += 0.4
      this.spiralAngle2 -= 0.28
      if (this.shotIndex % 5 === 0) {
        fireAimedFan(pool, x, y, spd * 1.3, 5, 0.6, playerX, playerY)
      }
    }
  }

  // ── Boss 3 "Bloom" — expanding petal walls with sniper gaps ─────────────
  private fireBloom(playerX: number, playerY: number, pool: BulletPool) {
    const x = this.sprite.x
    const y = this.sprite.y + 30
    const spd = 200 * this.cfg.bulletSpeedMult

    if (this.phase === 1) {
      fireFlower(pool, x, y, spd * 0.75, 16, 4, this.spiralAngle)
      this.spiralAngle += 0.35
    } else if (this.phase === 2) {
      if (this.shotIndex % 3 === 0) {
        fireFlower(pool, x, y, spd * 0.8, 20, 5, this.spiralAngle)
        this.spiralAngle += 0.5
      } else {
        fireAimedFan(pool, x, y, spd * 1.4, 1, 0, playerX, playerY)
      }
    } else {
      if (this.shotIndex % 3 === 0) {
        fireFlower(pool, x, y, spd * 0.85, 24, 6, this.spiralAngle)
        this.spiralAngle += 0.6
      } else {
        fireRing(pool, x, y, spd * 1.05, 8, this.spiralAngle2)
        this.spiralAngle2 += 0.55
        fireAimedFan(pool, x, y, spd * 1.45, 2, 0.18, playerX, playerY)
      }
    }
  }
}
