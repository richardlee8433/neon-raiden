import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { Actions } from '../systems/InputSystem'
import { BulletPool } from './BulletPool'
import { gameStore } from '../../store/gameStore'
import { audioSystem } from '../systems/AudioSystem'

const SPEED = 300
const BULLET_SPEED = 620

// Each entry is an array of [vx_norm, vy_norm] direction vectors per power level.
// vy is always negative (upward). vx gives the spread angle.
//   sin(10°)≈0.17  sin(15°)≈0.26  sin(20°)≈0.34
//   cos(10°)≈0.98  cos(15°)≈0.97  cos(20°)≈0.94
const SHOT_PATTERNS: [number, number][][] = [
  [[0, -1]],                                                          // power 0 – 1 shot
  [[-0.17, -0.98], [0.17, -0.98]],                                    // power 1 – 2 shots
  [[-0.26, -0.97], [0, -1], [0.26, -0.97]],                          // power 2 – 3 shots
  [[-0.34, -0.94], [-0.12, -0.99], [0.12, -0.99], [0.34, -0.94]],   // power 3 – 4 shots
  [[-0.34, -0.94], [-0.17, -0.98], [0, -1], [0.17, -0.98], [0.34, -0.94]], // power 4 – 5 shots
  [[-0.34, -0.94], [-0.17, -0.98], [0, -1], [0.17, -0.98], [0.34, -0.94]], // power 5 – 5 shots fast
]

const FIRE_RATE = [0.14, 0.13, 0.12, 0.11, 0.10, 0.08]  // decreases with power

export class Player {
  sprite: Sprite
  hitbox: Rectangle
  active = true
  firingLaser = false

  private fireTimer = 0
  private invincible = 0
  private flashTimer = 0

  constructor(
    container: Container,
    texture: Texture,
    private bulletPool: BulletPool,
    private stageW: number,
    private stageH: number,
  ) {
    this.sprite = new Sprite(texture)
    this.sprite.anchor.set(0.5)
    this.sprite.x = stageW / 2
    this.sprite.y = stageH * 0.8
    this.sprite.scale.set(2)
    container.addChild(this.sprite)

    const hw = (this.sprite.width * 0.35) / 2
    const hh = (this.sprite.height * 0.35) / 2
    this.hitbox = new Rectangle(-hw, -hh, hw * 2, hh * 2)
  }

  get x() { return this.sprite.x }
  get y() { return this.sprite.y }

  get hitboxWorld(): Rectangle {
    return new Rectangle(
      this.sprite.x + this.hitbox.x,
      this.sprite.y + this.hitbox.y,
      this.hitbox.width,
      this.hitbox.height,
    )
  }

  hit() {
    if (this.invincible > 0) return false
    this.invincible = 2
    return true
  }

  update(dt: number, actions: Actions) {
    const { moveX, moveY, fire } = actions

    const len = Math.sqrt(moveX * moveX + moveY * moveY) || 1
    this.sprite.x += (moveX / len) * SPEED * dt
    this.sprite.y += (moveY / len) * SPEED * dt

    const hw = this.sprite.width / 2
    const hh = this.sprite.height / 2
    this.sprite.x = Math.max(hw, Math.min(this.stageW - hw, this.sprite.x))
    this.sprite.y = Math.max(hh, Math.min(this.stageH - hh, this.sprite.y))

    const power  = Math.min(5, Math.max(0, gameStore.getState().power))

    // Power 5 = laser mode — skip bullet spawning
    this.firingLaser = fire && power >= 5
    if (!this.firingLaser) {
      const rate    = FIRE_RATE[power]
      const pattern = SHOT_PATTERNS[power]
      this.fireTimer -= dt
      if (fire && this.fireTimer <= 0) {
        this.fireTimer = rate
        const ox = this.sprite.x
        const oy = this.sprite.y - 20
        for (const [nx, ny] of pattern) {
          this.bulletPool.acquire(ox, oy, nx * BULLET_SPEED, ny * BULLET_SPEED)
        }
        audioSystem.playShoot(power)
      }
    }

    if (this.invincible > 0) {
      this.invincible -= dt
      this.flashTimer += dt
      this.sprite.alpha = Math.sin(this.flashTimer * 20) > 0 ? 1 : 0.3
    } else {
      this.sprite.alpha = 1
    }
  }
}
