import { Rectangle } from 'pixi.js'
import { BulletPool } from '../entities/BulletPool'
import { Enemy } from '../entities/Enemy'
import { Player } from '../entities/Player'
import { Boss } from '../entities/Boss'
import { PickupPool } from '../entities/Pickup'
import { GemPool } from '../entities/Gem'
import { ExplosionPool } from '../fx/Explosion'
import { gameStore } from '../../store/gameStore'
import { audioSystem } from './AudioSystem'
import { screenShake } from '../fx/ScreenShake'
import { hitstop } from '../fx/Hitstop'

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width  && a.x + a.width  > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y
  )
}

// Bullets passing within this box around the hitbox (without hitting)
// count as a graze: small score reward for flying dangerously close.
const GRAZE_RADIUS = 22

const ENEMY_LIFE_CHANCE   = 0.04   // 4%
const ENEMY_BOMB_CHANCE   = 0.10   // 6%
const ENEMY_LASER_CHANCE  = 0.18   // 8%
const ENEMY_DROP_CHANCE   = 0.32   // 14% — bullet power (cumulative)

export class CollisionSystem {
  check(
    playerBullets: BulletPool,
    enemyBullets: BulletPool,
    bossBullets: BulletPool,
    enemies: Enemy[],
    boss: Boss | null,
    player: Player,
    explosions: ExplosionPool,
    pickups: PickupPool,
    gems: GemPool,
  ) {
    // ── Player bullets vs enemies ──────────────────────────────────────────
    for (const bullet of playerBullets.active) {
      const br = new Rectangle(bullet.sprite.x - 3, bullet.sprite.y - 6, 6, 12)

      for (const enemy of enemies) {
        if (!intersects(br, enemy.hitboxWorld)) continue
        playerBullets.release(bullet)
        enemy.hp--
        if (enemy.hp > 0) enemy.flash()
        if (enemy.hp <= 0) {
          explosions.spawn(enemy.sprite.x, enemy.sprite.y, 2)
          screenShake.trigger(1.5)
          hitstop.trigger(0.025)
          audioSystem.playExplosion('small')
          gameStore.getState().addScore(enemy.scoreValue)
          const roll = Math.random()
          if (roll < ENEMY_LIFE_CHANCE)             pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'life')
          else if (roll < ENEMY_BOMB_CHANCE)        pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'bomb')
          else if (roll < ENEMY_LASER_CHANCE)       pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'laser')
          else if (roll < ENEMY_DROP_CHANCE)        pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'power')
          gems.spawn(enemy.sprite.x, enemy.sprite.y, Math.random() < 0.35 ? 2 : 1)
          enemy.deactivate()
        }
        break
      }

      // ── Player bullets vs boss ─────────────────────────────────────────
      if (boss?.active) {
        if (intersects(br, boss.hitboxWorld)) {
          playerBullets.release(bullet)
          const died = boss.hit(1)
          screenShake.trigger(died ? 5 : 3)
          audioSystem.playBossHurt()
          if (died) {
            explosions.spawn(boss.sprite.x, boss.sprite.y, 4)
            hitstop.trigger(0.3)
            gems.spawn(boss.sprite.x, boss.sprite.y, 16)
            gems.magnetizeAll()
          }
        }
      }
    }

    // ── Enemy & boss bullets vs player ────────────────────────────────────
    const grazeRect = new Rectangle(
      player.x - GRAZE_RADIUS, player.y - GRAZE_RADIUS,
      GRAZE_RADIUS * 2, GRAZE_RADIUS * 2,
    )
    if (player.isDead) return   // no hits or grazes against the hidden ship

    const allHostileBullets = [...enemyBullets.active, ...bossBullets.active]
    for (const bullet of allHostileBullets) {
      const br = new Rectangle(bullet.sprite.x - 3, bullet.sprite.y - 3, 6, 6)

      if (intersects(br, player.hitboxWorld)) {
        if (!player.hit()) continue
        const pool = enemyBullets.active.includes(bullet) ? enemyBullets : bossBullets
        pool.release(bullet)
        explosions.spawn(player.x, player.y, 2.5)
        screenShake.trigger(8)
        hitstop.trigger(0.15)
        audioSystem.playPlayerHit()
        const s = gameStore.getState()
        s.dropPower()
        pickups.spawn(player.x - 30, player.y - 60, 'power')
        pickups.spawn(player.x + 30, player.y - 60, 'power')
        s.loseLife()
        if (s.lives <= 1) s.setPhase('gameover')
        break
      }

      if (!bullet.grazed && intersects(br, grazeRect)) {
        bullet.grazed = true
        gameStore.getState().addGraze()
        audioSystem.playGraze()
      }
    }
  }
}
