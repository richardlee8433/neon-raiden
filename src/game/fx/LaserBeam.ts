import { Container, Graphics } from 'pixi.js'
import { Enemy } from '../entities/Enemy'
import { Boss } from '../entities/Boss'
import { ExplosionPool } from './Explosion'
import { screenShake } from './ScreenShake'
import { gameStore } from '../../store/gameStore'

const DMG_PER_SEC = 30

export class LaserBeam {
  private g: Graphics
  active = false

  constructor(container: Container, private stageH: number) {
    this.g = new Graphics()
    container.addChildAt(this.g, 0)
  }

  update(
    dt: number,
    firing: boolean,
    playerX: number,
    playerY: number,
    laserPower: number,
    enemies: Enemy[],
    boss: Boss | null,
    explosions: ExplosionPool,
  ) {
    this.g.clear()

    if (!firing || laserPower <= 0) {
      this.active = false
      return
    }

    this.active = true
    const w = 1 + laserPower * 0.25   // 1.25× – 2.25× at power 1–5
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.025)

    // Outer soft aura
    this.g.moveTo(playerX, 0).lineTo(playerX, playerY)
      .stroke({ color: 0x0055ff, width: 28 * w, alpha: 0.04 * pulse })
    // Mid glow
    this.g.moveTo(playerX, 0).lineTo(playerX, playerY)
      .stroke({ color: 0x22aaff, width: 14 * w, alpha: 0.14 * pulse })
    // Inner glow
    this.g.moveTo(playerX, 0).lineTo(playerX, playerY)
      .stroke({ color: 0x88ddff, width: 6 * w, alpha: 0.45 * pulse })
    // Bright core
    this.g.moveTo(playerX, 0).lineTo(playerX, playerY)
      .stroke({ color: 0xffffff, width: 2.5, alpha: pulse })

    // Muzzle flash ring at player
    const r = 10 + 4 * pulse
    this.g.circle(playerX, playerY, r)
      .stroke({ color: 0x88ddff, width: 2, alpha: 0.6 * pulse })

    // Continuous damage
    const dmg = DMG_PER_SEC * dt

    for (const e of enemies) {
      if (!e.active) continue
      if (Math.abs(e.sprite.x - playerX) > e.sprite.width * 0.5 + 4) continue
      if (e.sprite.y > playerY) continue

      e.hp -= dmg
      if (e.hp <= 0) {
        explosions.spawn(e.sprite.x, e.sprite.y, 2)
        gameStore.getState().addScore(e.scoreValue)
        screenShake.trigger(1.5)
        e.deactivate()
      }
    }

    if (boss?.active) {
      if (Math.abs(boss.sprite.x - playerX) < boss.sprite.width * 0.5 + 4) {
        const died = boss.hit(dmg)
        if (died) screenShake.trigger(5)
        else screenShake.trigger(0.8)
      }
    }
  }
}
