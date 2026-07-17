import { Application, Container } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'
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
import { screenShake } from '../fx/ScreenShake'
import { hitstop } from '../fx/Hitstop'
import { BulletTrail } from '../fx/BulletTrail'
import { LaserBeam } from '../fx/LaserBeam'
import { Shockwave } from '../fx/Shockwave'
import { makeGlowBulletTexture, makeGemTexture } from '../fx/GlowTexture'
import { GemPool } from '../entities/Gem'
import { musicSystem } from '../systems/MusicSystem'
import { EngineExhaust } from '../fx/EngineExhaust'
import { FloatingTextPool, multColor } from '../fx/FloatingText'
import { STAGES } from '../data/stages'
import { gameStore } from '../../store/gameStore'
import { audioSystem } from '../systems/AudioSystem'

import { STAGE_W as W, STAGE_H as H, SPRITE_SCALE } from '../config'

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
  private gems!: GemPool
  private explosions!: ExplosionPool
  private bombEffect!: BombEffect
  private bulletTrail!: BulletTrail
  private laser!: LaserBeam
  private exhaust!: EngineExhaust
  private shockwave!: Shockwave
  private floats!: FloatingTextPool

  private bgLayer!: Container
  private gameLayer!: Container
  private bulletLayer!: Container
  private fxLayer!: Container

  private bombCooldown = false
  private transitioning = false
  private bossCountdown = -1   // >=0: WARNING banner is up, boss enters at 0
  private chainTimer = 0       // kill-chain lapse countdown
  private lastChain = 0

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

    // Bullets + fx share one bloom pass so every glow texture actually glows.
    const glowWrap = new Container()
    glowWrap.addChild(this.bulletLayer, this.fxLayer)
    glowWrap.filters = [new AdvancedBloomFilter({
      threshold: 0.25, bloomScale: 1.1, brightness: 1, blur: 5, quality: 4,
    })]
    this.app.stage.addChild(this.bgLayer, this.gameLayer, glowWrap)

    this.scroll = new ScrollSystem(this.bgLayer, W, H, 'space')

    // Neon glow bullets (danmaku-style): enemy fire must pop against the
    // dark background and read differently from the player's shots.
    const enemyBulletTex = makeGlowBulletTexture(this.app.renderer, 0xff2e88, 5 * SPRITE_SCALE)
    const bossBulletTex  = makeGlowBulletTexture(this.app.renderer, 0x33eeff, 6 * SPRITE_SCALE)

    this.bulletTrail   = new BulletTrail(this.bulletLayer)
    this.playerBullets = new BulletPool(this.bulletLayer, assets.playerBullet, 300)
    this.enemyBullets  = new BulletPool(this.bulletLayer, enemyBulletTex, 1000)
    this.bossBullets   = new BulletPool(this.bulletLayer, bossBulletTex,  200)

    this.player    = new Player(this.gameLayer, assets.playerShip, this.playerBullets, W, H)
    this.boss      = new Boss(this.gameLayer)
    this.pickups   = new PickupPool(this.gameLayer, assets.pickupPower, assets.pickupBomb, assets.pickupLife, assets.pickupLaser)
    this.gems      = new GemPool(this.gameLayer, makeGemTexture(this.app.renderer, 7 * SPRITE_SCALE))
    this.laser      = new LaserBeam(this.fxLayer, H)
    this.explosions = new ExplosionPool(this.fxLayer, assets.explosionFrames)
    this.bombEffect = new BombEffect(this.fxLayer, W, H)
    this.shockwave  = new Shockwave(this.fxLayer)
    this.floats     = new FloatingTextPool(this.fxLayer)
    this.exhaust    = new EngineExhaust(
      this.bulletLayer, makeGlowBulletTexture(this.app.renderer, 0x44aaff, 3.5 * SPRITE_SCALE))

    this.waves = new WaveSystem(this.gameLayer)
    await this.waves.loadTextures()

    // Phase transitions
    gameStore.subscribe((s, prev) => {
      if (s.phase === 'playing' && prev.phase === 'title') {
        this.startStage(s.stage)
        musicSystem.start()
      }
      if (s.phase === 'stageclear' && prev.phase !== 'stageclear') {
        this.handleStageClear(s.stage)
      }
      if ((s.phase === 'gameover' || s.phase === 'title') && s.phase !== prev.phase) {
        musicSystem.stop()
      }
    })

    // Catch-up: on slow networks (VIVERSE/Netlify CDN) the player can press
    // START before init reaches this line — that title→playing transition
    // happened with no subscriber, so no stage was ever loaded and no enemies
    // would spawn. If we're already mid-"playing", start the stage now.
    if (gameStore.getState().phase === 'playing') {
      this.startStage(gameStore.getState().stage)
      musicSystem.start()
    }

    this.app.ticker.add(({ deltaMS }) => {
      const dt = Math.min(deltaMS / 1000, 0.05)
      this.tick(dt)
    })
  }

  private startStage(stageNum: number) {
    const cfg = STAGES[stageNum - 1] ?? STAGES[0]
    this.scroll.setTheme(cfg.bgTheme)
    this.waves.loadStage(cfg)
    this.playerBullets.releaseAll()
    this.enemyBullets.releaseAll()
    this.bossBullets.releaseAll()
    this.pickups.releaseAll()
    this.gems.releaseAll()
    this.floats.releaseAll()
    this.player.reset()
    gameStore.getState().resetChain()
    this.chainTimer = 0
    this.lastChain = 0
    this.transitioning = false
    this.bossCountdown = -1
    gameStore.getState().setBossWarning(false)
  }

  private handleStageClear(_stageNum: number) {
    if (this.transitioning) return
    this.transitioning = true

    // Advance to the next stage — advanceStage wraps past the last stage
    // into the next loop, where enemies come back faster and meaner.
    setTimeout(() => {
      gameStore.getState().advanceStage()   // phase → 'advancing'
    }, 2000)

    setTimeout(() => {
      const s = gameStore.getState()
      this.startStage(s.stage)
      gameStore.setState({ phase: 'playing' })
    }, 4500)
  }

  private tick(dt: number) {
    const state = gameStore.getState()
    if (state.paused) return   // freeze the whole scene while paused
    const phase = state.phase
    screenShake.update(dt, this.app.stage)
    this.scroll.update(dt)
    if (phase !== 'playing') return
    if (hitstop.update(dt)) return   // impact freeze-frame

    this.input.update()
    this.player.update(dt, this.input.actions)
    if (this.player.consumeJustDied()) this.onPlayerDeath()

    // Kill-chain lapse: each kill rearms the window; silence breaks the chain
    const chain = gameStore.getState().chain
    if (chain > this.lastChain) this.chainTimer = 2.0
    else if (chain > 0) {
      this.chainTimer -= dt
      if (this.chainTimer <= 0) gameStore.getState().resetChain()
    }
    this.lastChain = gameStore.getState().chain
    this.exhaust.update(dt, this.player.x, this.player.y, !this.player.isDead)
    this.bulletTrail.update(this.playerBullets)
    this.playerBullets.update(dt, W, H)
    this.enemyBullets.update(dt, W, H)
    this.bossBullets.update(dt, W, H)

    const { spawnBoss, activeLasers } = this.waves.update(dt, this.enemyBullets, this.player.x, this.player.y, H)
    if (spawnBoss && !this.boss.active && this.bossCountdown < 0) {
      // WARNING phase: clear the field, blare the siren, boss enters after it
      this.bossCountdown = 2.4
      gameStore.getState().setBossWarning(true)
      audioSystem.playSiren()
      this.waves.dismissAll()
      this.enemyBullets.releaseAll()
    }
    if (this.bossCountdown >= 0) {
      this.bossCountdown -= dt
      if (this.bossCountdown < 0 && !this.boss.active) {
        gameStore.getState().setBossWarning(false)
        const { stage, loop } = gameStore.getState()
        const cfg = STAGES[stage - 1] ?? STAGES[0]
        // Loop rank: later playthroughs field tougher, faster bosses
        const rank = Math.min(loop - 1, 4)
        const boss = rank === 0 ? cfg.boss : {
          ...cfg.boss,
          maxHp: Math.round(cfg.boss.maxHp * (1 + 0.25 * rank)),
          bulletSpeedMult: cfg.boss.bulletSpeedMult * (1 + 0.12 * rank),
          fireRateMult: cfg.boss.fireRateMult / (1 + 0.08 * rank),
        }
        this.boss.spawn(boss, stage)
      }
    }

    const laserPower = gameStore.getState().laserPower
    this.laser.update(
      dt, this.player.firingLaser,
      this.player.x, this.player.y,
      laserPower,
      this.waves.activeEnemies,
      this.boss.active ? this.boss : null,
      this.explosions,
      this.gems,
      this.floats,
    )

    // Enemy laser hits on player (registers a hit; death resolves below)
    for (const beam of activeLasers) {
      if (this.player.y > beam.fromY && Math.abs(this.player.x - beam.x) < 10) {
        this.player.hit()
        break
      }
    }

    if (this.boss.active) {
      this.boss.update(
        dt, this.player.x, this.player.y,
        this.bossBullets, this.explosions, this.bombEffect,
      )
    }

    this.pickups.update(dt, this.player.x, this.player.y, H)
    this.gems.update(dt, this.player.x, this.player.y, H)

    this.collision.check(
      this.playerBullets, this.enemyBullets, this.bossBullets,
      this.waves.activeEnemies,
      this.boss.active ? this.boss : null,
      this.player, this.explosions, this.pickups, this.gems, this.floats,
    )

    this.explosions.update(dt)
    this.bombEffect.update(dt)
    this.shockwave.update(dt)
    this.floats.update(dt)

    if (this.input.actions.bomb && !this.bombCooldown) {
      if (this.player.inGrace) {
        // Deathbomb: spend a bomb to cancel a pending death
        if (gameStore.getState().bombs > 0) {
          this.player.cancelDeath()
          this.triggerBomb()
        }
      } else if (!this.player.isDead) {
        this.triggerBomb()
      }
    }
  }

  private onPlayerDeath() {
    this.explosions.spawn(this.player.x, this.player.y, 2.5)
    screenShake.trigger(8)
    hitstop.trigger(0.15)
    audioSystem.playPlayerHit()
    const s = gameStore.getState()
    s.resetChain()   // death breaks the kill chain
    s.dropPower()
    this.pickups.spawn(this.player.x - 30, this.player.y - 60, 'power')
    this.pickups.spawn(this.player.x + 30, this.player.y - 60, 'power')
    s.loseLife()
    if (s.lives <= 1) s.setPhase('gameover')
  }

  private triggerBomb() {
    if (!gameStore.getState().useBomb()) return
    this.bombCooldown = true
    setTimeout(() => { this.bombCooldown = false }, 800)

    // Expanding shockwave from the ship instead of a flat white flash
    this.shockwave.trigger(this.player.x, this.player.y)
    screenShake.trigger(8)
    hitstop.trigger(0.08)
    audioSystem.playBomb()
    this.enemyBullets.releaseAll()
    this.bossBullets.releaseAll()

    for (const e of this.waves.activeEnemies) {
      e.hp -= 3
      if (e.hp <= 0) {
        this.explosions.spawn(e.sprite.x, e.sprite.y, 2)
        const { awarded, mult } = gameStore.getState().addKillScore(e.scoreValue)
        this.floats.spawn(e.sprite.x, e.sprite.y - 10, `+${awarded}`, multColor(mult))
        this.gems.spawn(e.sprite.x, e.sprite.y, 1)
        e.deactivate()
      }
    }
    if (this.boss.active) {
      const died = this.boss.hit(5)
      this.explosions.spawn(this.boss.sprite.x, this.boss.sprite.y, 3)
      audioSystem.playExplosion('large')
      if (died) {
        this.gems.spawn(this.boss.sprite.x, this.boss.sprite.y, 16)
        this.gems.magnetizeAll()
      }
    }
  }

  /** CSS scale of the canvas so touch deltas map to game pixels */
  setCanvasScale(s: number) {
    this.input.setCanvasScale(s)
  }

  destroy() {
    this.app.destroy()
    this.input.destroy()
  }
}
