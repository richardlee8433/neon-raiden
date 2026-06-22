import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js'
import { BulletPool } from './BulletPool'
import { gameStore } from '../../store/gameStore'

const BOSS_MAX_HP = 60
const STAGE_W = 480
const TARGET_Y = 120

export class Boss {
  sprite: Sprite
  active = false
  hp = BOSS_MAX_HP
  phase: 1 | 2 | 3 = 1

  private age = 0
  private fireTimer = 0
  private sweepDir = 1
  private state: 'entering' | 'fighting' | 'dying' = 'entering'
  private flashTimer = 0
  private spiralAngle = 0
  private hpBar: Graphics

  constructor(
    private container: Container,
    texture: Texture,
    private bossBullets: BulletPool,
  ) {
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.sprite.scale.set(3, -3)
    this.sprite.visible = false
    container.addChild(this.sprite)

    this.hpBar = new Graphics()
    container.addChild(this.hpBar)
  }

  get hitboxWorld(): Rectangle {
    const hw = (this.sprite.width * 0.4) / 2
    const hh = (this.sprite.height * 0.4) / 2
    return new Rectangle(this.sprite.x - hw, this.sprite.y - hh, hw * 2, hh * 2)
  }

  spawn() {
    this.active = true
    this.hp = BOSS_MAX_HP
    this.phase = 1
    this.state = 'entering'
    this.age = 0
    this.fireTimer = 0
    this.spiralAngle = 0
    this.sprite.x = STAGE_W / 2
    this.sprite.y = -80
    this.sprite.alpha = 1
    this.sprite.visible = true
    gameStore.getState().setBossActive(true)
    gameStore.getState().setBossHp(BOSS_MAX_HP, BOSS_MAX_HP)
  }

  hit(damage = 1): boolean {
    if (!this.active || this.state === 'dying') return false
    this.hp -= damage
    this.flashTimer = 0.1
    this.sprite.tint = 0xff4444

    const newPhase = this.hp > 40 ? 1 : this.hp > 20 ? 2 : 3
    if (newPhase !== this.phase) {
      this.phase = newPhase as 1 | 2 | 3
      this.flashTimer = 0.4
    }
    gameStore.getState().setBossHp(Math.max(0, this.hp), BOSS_MAX_HP)

    if (this.hp <= 0) {
      this.state = 'dying'
      return true
    }
    return false
  }

  update(dt: number, playerX: number) {
    if (!this.active) return
    this.age += dt

    // Flash on hit
    if (this.flashTimer > 0) {
      this.flashTimer -= dt
      if (this.flashTimer <= 0) this.sprite.tint = 0xffffff
    }

    // Entry animation
    if (this.state === 'entering') {
      this.sprite.y += 80 * dt
      if (this.sprite.y >= TARGET_Y) {
        this.sprite.y = TARGET_Y
        this.state = 'fighting'
      }
      this.drawHpBar()
      return
    }

    if (this.state === 'dying') {
      this.sprite.alpha -= dt * 1.5
      if (this.sprite.alpha <= 0) {
        this.active = false
        this.sprite.visible = false
        this.hpBar.clear()
        gameStore.getState().setBossActive(false)
        gameStore.getState().addScore(5000)
        gameStore.getState().setPhase('stageclear')
      }
      return
    }

    // Movement per phase
    const speed = [0, 60, 100, 140][this.phase]
    this.sprite.x += this.sweepDir * speed * dt
    if (this.sprite.x > STAGE_W - 60 || this.sprite.x < 60) {
      this.sweepDir *= -1
    }

    if (this.phase === 3) {
      this.sprite.y = TARGET_Y + Math.sin(this.age * 1.5) * 30
    }

    // Fire
    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      this.fire(playerX)
      this.fireTimer = [0, 1.5, 1.0, 0.55][this.phase]
    }

    this.drawHpBar()
  }

  private fire(playerX: number) {
    const x = this.sprite.x
    const y = this.sprite.y + 30

    if (this.phase === 1) {
      this.spreadShot(x, y, 3, 180)
    } else if (this.phase === 2) {
      this.spreadShot(x, y, 5, 160)
      // aimed shot
      const dx = playerX - x
      const dy = 640 - y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      this.bossBullets.acquire(x, y, (dx / len) * 260, (dy / len) * 260)
    } else {
      // spiral
      for (let i = 0; i < 8; i++) {
        const angle = this.spiralAngle + (i * Math.PI * 2) / 8
        this.bossBullets.acquire(x, y, Math.cos(angle) * 200, Math.sin(angle) * 200)
      }
      this.spiralAngle += 0.3
    }
  }

  private spreadShot(x: number, y: number, count: number, speed: number) {
    const angleStart = Math.PI / 2 - (Math.PI / 4)
    const step = count > 1 ? Math.PI / 2 / (count - 1) : 0
    for (let i = 0; i < count; i++) {
      const a = angleStart + i * step
      this.bossBullets.acquire(x, y, Math.cos(a) * speed, Math.sin(a) * speed)
    }
  }

  private drawHpBar() {
    const pct = Math.max(0, this.hp / BOSS_MAX_HP)
    const barW = 200
    const barH = 10
    const bx = STAGE_W / 2 - barW / 2
    const by = 10

    this.hpBar.clear()
    this.hpBar.rect(bx - 1, by - 1, barW + 2, barH + 2).fill({ color: 0x000000 })
    this.hpBar.rect(bx, by, barW, barH).fill({ color: 0x333333 })
    const fillColor = pct > 0.5 ? 0x00dd44 : pct > 0.25 ? 0xffaa00 : 0xff2222
    this.hpBar.rect(bx, by, barW * pct, barH).fill({ color: fillColor })
  }
}
