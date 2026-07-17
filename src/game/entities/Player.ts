import { Container, Sprite, Texture, Rectangle, Graphics } from 'pixi.js'
import { Actions } from '../systems/InputSystem'
import { BulletPool } from './BulletPool'
import { gameStore } from '../../store/gameStore'
import { audioSystem } from '../systems/AudioSystem'
import { STAGE_W } from '../config'

// Wide (landscape) battlefields need proportionally faster strafing or
// crossing the field feels sluggish; portrait keeps the classic 300.
const SPEED = 300 * Math.max(1, STAGE_W / 640)
const FOCUS_SPEED_MULT = 0.4
const BANK_ANGLE = 0.22        // max hull tilt (radians) when strafing
const RESPAWN_DELAY = 1.1      // seconds off-screen after death
const RESPAWN_FLY_SPEED = 300  // fly-in speed from the bottom edge
const RESPAWN_INVINCIBLE = 3
// Deathbomb: after a fatal hit the death is held for a brief window; bombing
// within it cancels the death entirely (a classic hardcore-shmup mechanic).
const DEATHBOMB_WINDOW = 0.15
const DEATHBOMB_IFRAMES = 1.5
// Danmaku-style: only this tiny box at the ship's core takes hits,
// so wings can brush through bullet curtains.
const HITBOX_SIZE = 6
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
  private focusDot: Graphics
  private dotPulse = 0
  private state: 'alive' | 'grace' | 'dead' | 'respawning' = 'alive'
  private respawnTimer = 0
  private graceTimer = 0
  private justDied = false
  private tilt = 0

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

    const half = HITBOX_SIZE / 2
    this.hitbox = new Rectangle(-half, -half, HITBOX_SIZE, HITBOX_SIZE)

    this.focusDot = new Graphics()
    this.focusDot.circle(0, 0, 5.5).fill({ color: 0xff3366, alpha: 0.55 })
    this.focusDot.circle(0, 0, 2.5).fill(0xffffff)
    this.focusDot.visible = false
    container.addChild(this.focusDot)
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

  get isDead() { return this.state !== 'alive' }
  get inGrace() { return this.state === 'grace' }

  /**
   * Registers a fatal hit by opening the deathbomb window. Returns true if it
   * connects. Death isn't final yet — GameApp resolves it via consumeJustDied()
   * once the window lapses, or cancelDeath() cancels it if the player bombs.
   */
  hit() {
    if (this.state !== 'alive' || this.invincible > 0) return false
    this.state = 'grace'
    this.graceTimer = DEATHBOMB_WINDOW
    return true
  }

  /** Deathbomb — cancel a pending death and grant brief invincibility. */
  cancelDeath() {
    if (this.state !== 'grace') return
    this.state = 'alive'
    this.invincible = DEATHBOMB_IFRAMES
    this.flashTimer = 0
    this.sprite.tint = 0xffffff
  }

  /** True on the single frame the death becomes final; GameApp runs the
   *  explosion / power-drop / life-loss consequences. */
  consumeJustDied() {
    if (!this.justDied) return false
    this.justDied = false
    return true
  }

  /** Restore to a clean living state for a new game. */
  reset() {
    this.state = 'alive'
    this.justDied = false
    this.graceTimer = 0
    this.invincible = 0
    this.tilt = 0
    this.sprite.rotation = 0
    this.sprite.visible = true
    this.sprite.alpha = 1
    this.sprite.tint = 0xffffff
    this.sprite.x = this.stageW / 2
    this.sprite.y = this.stageH * 0.8
  }

  update(dt: number, actions: Actions) {
    // Deathbomb window: hold the death for a beat, flashing red so the player
    // registers the danger and can still bomb out of it.
    if (this.state === 'grace') {
      this.graceTimer -= dt
      this.sprite.tint = Math.sin(this.graceTimer * 80) > 0 ? 0xff4444 : 0xffffff
      if (this.graceTimer <= 0) {
        this.sprite.tint = 0xffffff
        this.state = 'dead'
        this.justDied = true
        this.respawnTimer = RESPAWN_DELAY
        this.sprite.visible = false
        this.focusDot.visible = false
      }
      return
    }
    // Death → respawn sequence: hidden for a beat, then fly in from below
    if (this.state === 'dead') {
      this.respawnTimer -= dt
      if (this.respawnTimer <= 0) {
        this.state = 'respawning'
        this.sprite.visible = true
        this.sprite.x = this.stageW / 2
        this.sprite.y = this.stageH + 50
        this.sprite.rotation = 0
        this.tilt = 0
        this.invincible = RESPAWN_INVINCIBLE
        this.flashTimer = 0
      }
      return
    }
    if (this.state === 'respawning') {
      this.sprite.y -= RESPAWN_FLY_SPEED * dt
      this.invincible -= dt
      this.flashTimer += dt
      this.sprite.alpha = Math.sin(this.flashTimer * 20) > 0 ? 1 : 0.3
      if (this.sprite.y <= this.stageH * 0.8) {
        this.sprite.y = this.stageH * 0.8
        this.state = 'alive'
      }
      return
    }

    const { moveX, moveY, fire, focus } = actions

    const speed = focus ? SPEED * FOCUS_SPEED_MULT : SPEED
    const len = Math.sqrt(moveX * moveX + moveY * moveY) || 1
    this.sprite.x += (moveX / len) * speed * dt
    this.sprite.y += (moveY / len) * speed * dt

    // Touch drag: direct positional control
    if (actions.touchActive) {
      this.sprite.x += actions.touchDX
      this.sprite.y += actions.touchDY
    }

    const hw = this.sprite.width / 2
    const hh = this.sprite.height / 2
    this.sprite.x = Math.max(hw, Math.min(this.stageW - hw, this.sprite.x))
    this.sprite.y = Math.max(hh, Math.min(this.stageH - hh, this.sprite.y))

    // Bank the hull into the strafe direction (lerped, so it eases in/out)
    const tiltInput = Math.max(-1, Math.min(1,
      moveX + (actions.touchActive ? actions.touchDX * 0.12 : 0)))
    this.tilt += (tiltInput * BANK_ANGLE - this.tilt) * Math.min(1, 12 * dt)
    this.sprite.rotation = this.tilt

    const state = gameStore.getState()
    const power = Math.min(4, Math.max(0, state.power))
    this.firingLaser = fire && state.laserPower > 0

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

    if (this.invincible > 0) {
      this.invincible -= dt
      this.flashTimer += dt
      this.sprite.alpha = Math.sin(this.flashTimer * 20) > 0 ? 1 : 0.3
    } else {
      this.sprite.alpha = 1
    }

    this.focusDot.visible = focus
    if (focus) {
      this.dotPulse += dt
      this.focusDot.x = this.sprite.x
      this.focusDot.y = this.sprite.y
      this.focusDot.scale.set(1 + 0.15 * Math.sin(this.dotPulse * 8))
    }
  }
}
