import { Rectangle } from 'pixi.js'
import { BulletPool } from '../entities/BulletPool'
import { Enemy } from '../entities/Enemy'
import { Player } from '../entities/Player'
import { Boss } from '../entities/Boss'
import { PickupPool } from '../entities/Pickup'
import { ExplosionPool } from '../fx/Explosion'
import { gameStore } from '../../store/gameStore'

function intersects(a: Rectangle, b: Rectangle): boolean {
  return (
    a.x < b.x + b.width  && a.x + a.width  > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y
  )
}

const ENEMY_DROP_CHANCE   = 0.25
const ENEMY_BOMB_CHANCE   = 0.10

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
  ) {
    // ── Player bullets vs enemies ──────────────────────────────────────────
    for (const bullet of playerBullets.active) {
      const br = new Rectangle(bullet.sprite.x - 3, bullet.sprite.y - 6, 6, 12)

      for (const enemy of enemies) {
        if (!intersects(br, enemy.hitboxWorld)) continue
        playerBullets.release(bullet)
        enemy.hp--
        if (enemy.hp <= 0) {
          explosions.spawn(enemy.sprite.x, enemy.sprite.y, 2)
          gameStore.getState().addScore(enemy.scoreValue)
          // drop pickup
          const roll = Math.random()
          if (roll < ENEMY_BOMB_CHANCE)        pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'bomb')
          else if (roll < ENEMY_DROP_CHANCE)   pickups.spawn(enemy.sprite.x, enemy.sprite.y, 'power')
          enemy.deactivate()
        }
        break
      }

      // ── Player bullets vs boss ─────────────────────────────────────────
      if (boss?.active) {
        if (intersects(br, boss.hitboxWorld)) {
          playerBullets.release(bullet)
          if (boss.hit(1)) {
            // boss death handled inside Boss.update
            explosions.spawn(boss.sprite.x, boss.sprite.y, 4)
          }
        }
      }
    }

    // ── Enemy & boss bullets vs player ────────────────────────────────────
    const allHostileBullets = [...enemyBullets.active, ...bossBullets.active]
    for (const bullet of allHostileBullets) {
      const br = new Rectangle(bullet.sprite.x - 3, bullet.sprite.y - 3, 6, 6)
      if (!intersects(br, player.hitboxWorld)) continue
      if (!player.hit()) continue

      const pool = enemyBullets.active.includes(bullet) ? enemyBullets : bossBullets
      pool.release(bullet)
      explosions.spawn(player.x, player.y, 1.5)
      const s = gameStore.getState()
      s.loseLife()
      if (s.lives <= 1) s.setPhase('gameover')
    }
  }
}
