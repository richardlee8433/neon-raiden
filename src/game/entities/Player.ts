import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { Actions } from '../systems/InputSystem'
import { BulletPool } from './BulletPool'

const SPEED = 300
const FIRE_RATE = 0.12  // seconds between shots
const BULLET_SPEED = 600

export class Player {
  sprite: Sprite
  hitbox: Rectangle
  active = true

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

    this.fireTimer -= dt
    if (fire && this.fireTimer <= 0) {
      this.fireTimer = FIRE_RATE
      this.bulletPool.acquire(this.sprite.x, this.sprite.y - 20, 0, -BULLET_SPEED)
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
