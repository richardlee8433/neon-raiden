import { Container, Sprite, Texture } from 'pixi.js'
import { gameStore } from '../../store/gameStore'
import { audioSystem } from '../systems/AudioSystem'
import { SPRITE_SCALE } from '../config'

interface Gem {
  sprite: Sprite
  vx: number
  vy: number
  active: boolean
  magnet: boolean   // sticky: once attracted, keeps homing until collected
}

const GEM_SCORE = 100
const FALL_SPEED = 90
const COLLECT_RADIUS = 26 * SPRITE_SCALE
const PROXIMITY_RADIUS = 70 * SPRITE_SCALE   // gems this close always latch on
const VACUUM_LINE = 0.28         // player above stageH*this → vacuum the field
const MAGNET_ACCEL = 2600
const MAGNET_MAX = 780

export class GemPool {
  private pool: Gem[] = []
  private streak = 0
  private streakTimer = 0

  constructor(container: Container, texture: Texture, size = 80) {
    for (let i = 0; i < size; i++) {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.visible = false
      container.addChild(sprite)
      this.pool.push({ sprite, vx: 0, vy: 0, active: false, magnet: false })
    }
  }

  /** Scatter gems with an upward pop so they hang before falling. */
  spawn(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const gem = this.pool.find((g) => !g.active)
      if (!gem) return
      gem.active = true
      gem.magnet = false
      gem.vx = (Math.random() - 0.5) * 140
      gem.vy = -60 - Math.random() * 110
      gem.sprite.x = x + (Math.random() - 0.5) * 16
      gem.sprite.y = y
      gem.sprite.alpha = 1
      gem.sprite.visible = true
    }
  }

  /** Boss kill / stage clear reward: pull every gem on screen to the player. */
  magnetizeAll() {
    for (const gem of this.pool) if (gem.active) gem.magnet = true
  }

  update(dt: number, playerX: number, playerY: number, stageH: number) {
    this.streakTimer -= dt
    if (this.streakTimer <= 0) this.streak = 0

    const vacuum = playerY < stageH * VACUUM_LINE

    for (const gem of this.pool) {
      if (!gem.active) continue
      const dx = playerX - gem.sprite.x
      const dy = playerY - gem.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1

      if (vacuum || dist < PROXIMITY_RADIUS) gem.magnet = true

      if (gem.magnet) {
        gem.vx += (dx / dist) * MAGNET_ACCEL * dt
        gem.vy += (dy / dist) * MAGNET_ACCEL * dt
        const v = Math.sqrt(gem.vx * gem.vx + gem.vy * gem.vy)
        if (v > MAGNET_MAX) {
          gem.vx = (gem.vx / v) * MAGNET_MAX
          gem.vy = (gem.vy / v) * MAGNET_MAX
        }
      } else {
        // scatter pop decays into a gentle drift downward
        gem.vx *= 1 - 2.5 * dt
        gem.vy += (FALL_SPEED - gem.vy) * 2 * dt
      }

      gem.sprite.x += gem.vx * dt
      gem.sprite.y += gem.vy * dt
      gem.sprite.rotation += 2.4 * dt
      gem.sprite.alpha = 0.8 + 0.2 * Math.sin(Date.now() / 150)

      if (dist < COLLECT_RADIUS) {
        this.streak++
        this.streakTimer = 0.8
        gameStore.getState().addScore(GEM_SCORE)
        audioSystem.playGem(this.streak)
        gem.active = false
        gem.sprite.visible = false
        continue
      }

      if (gem.sprite.y > stageH + 30) {
        gem.active = false
        gem.sprite.visible = false
      }
    }
  }

  releaseAll() {
    for (const gem of this.pool) {
      gem.active = false
      gem.sprite.visible = false
    }
  }
}
