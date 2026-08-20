import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js'
import { EnemyDef } from '../data/enemies'
import { BulletPool } from './BulletPool'
import { EnemyPath } from '../data/stages'
import { fireRing, fireAimedFan } from '../systems/BulletPatterns'
import { STAGE_H, PLAYFIELD_LEFT, PLAYFIELD_RIGHT, SPRITE_SCALE } from '../config'

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
  private spiralAngle = 0
  private hitFlash = 0
  private hitBurst = 0
  private hitAngle = 0
  private fireTimer = 0
  private engineG: Graphics
  private hitG: Graphics
  // Committed dive heading (unit vector), locked once instead of re-aimed
  private aimVx = 0
  private aimVy = 1
  private diveLocked = false

  constructor(private container: Container, texture: Texture) {
    this.engineG = new Graphics()
    this.hitG = new Graphics()
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.sprite.visible = false
    this.engineG.visible = false
    this.hitG.visible = false
    container.addChild(this.engineG, this.sprite, this.hitG)
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
    // Random phase on the shot cadence. Every member of a squadron shares the
    // same age, so a shared timer made them all fire on the same frame — one
    // solid wall of bullets instead of fire coming from individual ships.
    this.fireTimer = def.fireRate > 0
      ? def.fireRate * (0.35 + Math.random() * 0.65)
      : 0
    this.laserDuration = 0
    this.spiralAngle = Math.random() * Math.PI * 2  // desync pattern shooters
    if (def.usesLaser && !this.laserG) {
      this.laserG = new Graphics()
      this.container.addChild(this.laserG)
    }
    this.sprite.texture = texture
    this.sprite.x = x
    this.sprite.y = y
    this.sprite.scale.set(def.scale * SPRITE_SCALE)
    this.sprite.rotation = Math.PI   // flip to face downward (avoids negative-scale GPU issues)
    this.sprite.alpha = 1
    this.sprite.tint = 0xffffff
    this.hitFlash = 0
    this.hitBurst = 0
    this.engineG.visible = true
    this.hitG.visible = true
    this.sprite.visible = true
    this.active = true

    // diagonal entry angle: 30° inward
    this.diagVx = path === 'diagonal-left'  ? -0.58 :   // tan(30°)
                  path === 'diagonal-right' ?  0.58 : 0

    // A dive commits to its heading the moment it enters; a diagonal commits
    // later, when it crosses the trigger line mid-screen.
    this.aimVx = 0
    this.aimVy = 1
    this.diveLocked = false
    if (path === 'dive') this.lockDive(x, y, playerX)

    const hw = (this.sprite.width  * 0.6) / 2
    const hh = (this.sprite.height * 0.6) / 2
    this.hitbox = new Rectangle(-hw, -hh, hw * 2, hh * 2)
  }

  deactivate() {
    this.active = false
    this.sprite.visible = false
    this.engineG.clear()
    this.hitG.clear()
    this.engineG.visible = false
    this.hitG.visible = false
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

  /** Flash, sparks and a brief impact star make non-lethal hits read instantly. */
  flash() {
    if (this.hitFlash <= 0) {
      this.hitBurst = 0.13
      this.hitAngle = Math.random() * Math.PI * 2
    }
    this.hitFlash = 0.09
    this.sprite.tint = 0xff684f
  }

  update(dt: number, bulletPool: BulletPool, stageH: number, playerX: number, playerY = 512) {
    if (!this.active) return
    this.age += dt

    if (this.hitFlash > 0) {
      this.hitFlash -= dt
      if (this.hitFlash <= 0) this.sprite.tint = 0xffffff
    }
    this.hitBurst = Math.max(0, this.hitBurst - dt)
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

      case 'dive':
        // Straight, committed run along the heading locked at spawn. Re-aiming
        // every frame made this track the player like a homing missile, which
        // reads wrong for a dive-bomber and can't be learned or dodged on
        // pattern — the thing the genre is built on.
        this.sprite.x += this.aimVx * spd * dt
        this.sprite.y += this.aimVy * spd * dt
        break

      case 'diagonal-left':
      case 'diagonal-right': {
        // Straight down + horizontal drift, then one committed dive. The aim
        // is snapshotted as it crosses the trigger line, so the turn reads as
        // a single decisive break rather than a continuous swerve.
        if (!this.diveLocked) {
          this.sprite.y += spd * dt
          this.sprite.x += this.diagVx * spd * dt
          if (this.sprite.y >= stageH * 0.35) {
            this.lockDive(this.sprite.x, this.sprite.y, playerX)
          }
        } else {
          this.sprite.x += this.aimVx * spd * 0.9 * dt
          this.sprite.y += this.aimVy * spd * 0.9 * dt
        }
        break
      }
    }

    // fire — countdown seeded with a random phase at spawn, so a squadron's
    // shots scatter over time instead of landing as one synchronized volley
    if (this.def.fireRate > 0) {
      this.fireTimer -= dt
      if (this.fireTimer <= 0) {
        this.fireTimer += this.def.fireRate
        if (this.fireTimer <= 0) this.fireTimer = this.def.fireRate   // dt spike
        this.fire(bulletPool, playerX, playerY)
      }
    }

    // off-screen cull, plus a hard max-age failsafe so an enemy can never
    // linger on screen indefinitely even if a movement pattern stalls.
    if (
      this.sprite.y > stageH + 60 || this.sprite.y < -200 ||
      this.sprite.x < PLAYFIELD_LEFT - 120 || this.sprite.x > PLAYFIELD_RIGHT + 120 ||
      this.age > 30
    ) { this.deactivate(); return }

    this.drawVisualFx()

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

  /**
   * Snapshots a dive heading toward the player, aimed at a point well below
   * the screen so the run always keeps descending and exits cleanly. Because
   * the target is fixed, the resulting path is a straight line.
   */
  private lockDive(x: number, y: number, targetX: number) {
    const dx = targetX - x
    const dy = (STAGE_H + 300) - y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    this.aimVx = dx / len
    this.aimVy = dy / len
    this.diveLocked = true
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
      case 'ring':
        fireRing(pool, x, y, spd, this.def.bulletCount ?? 8, this.spiralAngle)
        this.spiralAngle += 0.3   // rotate successive rings so gaps shift
        break
      case 'spiral':
        fireRing(pool, x, y, spd, this.def.bulletCount ?? 2, this.spiralAngle)
        this.spiralAngle += 0.42  // per-volley advance traces the spiral arms
        break
      case 'aimed-fan':
        fireAimedFan(pool, x, y, spd, this.def.bulletCount ?? 3, 0.44, playerX, playerY)
        break
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

  private drawVisualFx() {
    const x = this.sprite.x
    const y = this.sprite.y
    const pulse = 0.72 + 0.28 * Math.sin(this.age * 18 + x * 0.03)
    const color = this.def.engineColor ?? 0x55ddff
    const count = this.def.engineCount ?? 1
    const tailY = y - this.sprite.height * 0.43
    const spread = this.sprite.width * 0.16

    this.engineG.clear()
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread
      this.engineG.ellipse(x + offset, tailY - 3 * pulse, 5.5, 10 + 4 * pulse)
        .fill({ color, alpha: 0.12 * pulse })
      this.engineG.ellipse(x + offset, tailY, 2.3, 5 + 2.5 * pulse)
        .fill({ color: 0xffffff, alpha: 0.68 * pulse })
    }

    this.hitG.clear()
    if (this.hitBurst > 0) {
      const p = 1 - this.hitBurst / 0.13
      const radius = 5 + p * 14
      for (let i = 0; i < 6; i++) {
        const a = this.hitAngle + i * Math.PI / 3
        const inner = radius * 0.32
        this.hitG.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner)
          .lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
          .stroke({ color: i % 2 ? 0xff8a36 : 0xffffff, width: 1.8, alpha: 1 - p })
      }
      this.hitG.circle(x, y, 3 + p * 4)
        .fill({ color: 0xffffff, alpha: (1 - p) * 0.85 })
    }
  }
}
