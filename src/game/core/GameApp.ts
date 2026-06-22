import { Application, Container } from 'pixi.js'
import { loadAssets } from '../../assets/AssetLoader'
import { InputSystem } from '../systems/InputSystem'
import { ScrollSystem } from '../systems/ScrollSystem'
import { CollisionSystem } from '../systems/CollisionSystem'
import { WaveSystem } from '../systems/WaveSystem'
import { BulletPool } from '../entities/BulletPool'
import { Player } from '../entities/Player'
import { Boss } from '../entities/Boss'
import { PickupPool } from '../entities/Pickup'
import { ExplosionPool } from '../fx/Explosion'
import { BombEffect } from '../fx/BombEffect'
import { gameStore } from '../../store/gameStore'

const W = 480, H = 640

export class GameApp {
  private app: Application
  private input: InputSystem
  private collision: CollisionSystem

  private scroll!: ScrollSystem
  private waves!: WaveSystem
  private playerBullets!: BulletPool
  private enemyBullets!: BulletPool
  private bossBullets!: BulletPool
  private player!: Player
  private boss!: Boss
  private pickups!: PickupPool
  private explosions!: ExplosionPool
  private bombEffect!: BombEffect

  private bgLayer!: Container
  private gameLayer!: Container
  private bulletLayer!: Container
  private fxLayer!: Container

  constructor(private canvas: HTMLCanvasElement) {
    this.app = new Application()
    this.input = new InputSystem()
    this.collision = new CollisionSystem()
  }

  async init() {
    await this.app.init({
      canvas: this.canvas,
      width: W, height: H,
      background: 0x000011,
      antialias: false,
      resizeTo: undefined,
    })

    const assets = await loadAssets()
    console.log('[GameApp] assets loaded')

    this.bgLayer     = new Container()
    this.gameLayer   = new Container()
    this.bulletLayer = new Container()
    this.fxLayer     = new Container()
    this.app.stage.addChild(this.bgLayer, this.gameLayer, this.bulletLayer, this.fxLayer)

    this.scroll = new ScrollSystem(this.bgLayer, W, H)

    this.playerBullets = new BulletPool(this.bulletLayer, assets.playerBullet, 200)
    this.enemyBullets  = new BulletPool(this.bulletLayer, assets.enemyBullet,  500)
    this.bossBullets   = new BulletPool(this.bulletLayer, assets.bossBullet,   200)

    this.player = new Player(this.gameLayer, assets.playerShip, this.playerBullets, W, H)

    this.boss = new Boss(this.gameLayer, assets.bossShip, this.bossBullets)

    this.pickups = new PickupPool(this.gameLayer, assets.pickupPower, assets.pickupBomb)

    this.explosions = new ExplosionPool(this.fxLayer, assets.explosionFrames)

    this.bombEffect = new BombEffect(this.fxLayer, W, H)

    this.waves = new WaveSystem(this.gameLayer)
    await this.waves.loadTextures()

    // Listen for title → playing transition to start/restart game
    gameStore.subscribe((s, prev) => {
      if (s.phase === 'playing' && prev.phase !== 'playing') {
        this.restartGame()
      }
    })

    // Start paused on title
    this.app.ticker.add(({ deltaMS }) => {
      const dt = Math.min(deltaMS / 1000, 0.05)
      this.tick(dt)
    })
  }

  private restartGame() {
    this.waves.reset()
    this.playerBullets.releaseAll()
    this.enemyBullets.releaseAll()
    this.bossBullets.releaseAll()
    this.pickups.releaseAll()
    this.player['sprite'].x = W / 2
    this.player['sprite'].y = H * 0.8
  }

  private tick(dt: number) {
    const phase = gameStore.getState().phase
    this.scroll.update(dt)

    if (phase !== 'playing') return

    this.input.update()
    this.player.update(dt, this.input.actions)
    this.playerBullets.update(dt, W, H)
    this.enemyBullets.update(dt, W, H)
    this.bossBullets.update(dt, W, H)

    const spawnBoss = this.waves.update(dt, this.enemyBullets, this.player.x, H)
    if (spawnBoss && !this.boss.active) {
      this.waves.dismissAll()
      this.enemyBullets.releaseAll()
      this.boss.spawn()
    }

    if (this.boss.active) this.boss.update(dt, this.player.x)

    this.pickups.update(dt, this.player.x, this.player.y, H)

    this.collision.check(
      this.playerBullets, this.enemyBullets, this.bossBullets,
      this.waves.activeEnemies, this.boss.active ? this.boss : null,
      this.player, this.explosions, this.pickups,
    )

    this.explosions.update(dt)
    this.bombEffect.update(dt)

    // Bomb skill
    if (this.input.actions.bomb && !this.bombCooldown) {
      this.triggerBomb()
    }
  }

  private bombCooldown = false

  private triggerBomb() {
    if (!gameStore.getState().useBomb()) return
    this.bombCooldown = true
    setTimeout(() => { this.bombCooldown = false }, 800)

    this.bombEffect.trigger()
    this.enemyBullets.releaseAll()
    this.bossBullets.releaseAll()

    for (const e of this.waves.activeEnemies) {
      e.hp -= 3
      if (e.hp <= 0) {
        this.explosions.spawn(e.sprite.x, e.sprite.y, 2)
        gameStore.getState().addScore(e.scoreValue)
        e.deactivate()
      }
    }

    if (this.boss.active) {
      this.boss.hit(5)
      this.explosions.spawn(this.boss.sprite.x, this.boss.sprite.y, 3)
    }
  }

  destroy() {
    this.app.destroy()
    this.input.destroy()
  }
}
