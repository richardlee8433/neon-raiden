import { Container, Texture } from 'pixi.js'
import { StageConfig, WaveEntry } from '../data/stages'
import { ENEMIES, EnemyDef } from '../data/enemies'
import { Enemy } from '../entities/Enemy'
import { BulletPool } from '../entities/BulletPool'
import { gameStore } from '../../store/gameStore'
import { STAGE_W } from '../config'

const POOL_SIZE = 96
// Global spawn-density multiplier: every wave fields 50% more enemies,
// so the screen stays busier without rewriting per-stage wave data.
const DENSITY_MULT = 1.5

export class WaveSystem {
  private enemies: Enemy[] = []
  private textures = new Map<string, Texture>()
  private elapsed = 0
  private nextWaveIdx = 0
  private waves: WaveEntry[] = []
  private bossTriggerTime = 42
  bossTriggered = false

  constructor(private container: Container) {}

  async loadTextures() {
    const loadTex = (src: string): Promise<Texture> =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(Texture.from(img))
        img.onerror = () => reject(new Error(`Failed to load: ${src}`))
        img.src = src
      })

    // Parallel: sequential awaits over a real CDN added seconds of startup
    // during which a quick START press could race past initialization.
    await Promise.all(
      Object.entries(ENEMIES).map(async ([key, def]) => {
        this.textures.set(key, await loadTex(def.sprite))
      }),
    )
    const defaultTex = this.textures.get('fighter')!
    for (let i = 0; i < POOL_SIZE; i++) {
      this.enemies.push(new Enemy(this.container, defaultTex))
    }
  }

  loadStage(cfg: StageConfig) {
    this.waves = cfg.waves
    this.bossTriggerTime = cfg.bossTriggerTime
    this.elapsed = 0
    this.nextWaveIdx = 0
    this.bossTriggered = false
    this.dismissAll()
  }

  private spawnWave(entry: WaveEntry, playerX: number) {
    let def: EnemyDef | undefined = ENEMIES[entry.type]
    if (!def) return
    const tex = this.textures.get(entry.type)
    if (!tex) return

    // Loop rank: every playthrough past the first fields faster enemies
    // with quicker, faster bullets (capped so loop 5+ stays humanly possible)
    const rank = Math.min(gameStore.getState().loop - 1, 4)
    if (rank > 0) {
      def = {
        ...def,
        speed: def.speed * (1 + 0.12 * rank),
        bulletSpeed: def.bulletSpeed * (1 + 0.15 * rank),
        fireRate: def.fireRate / (1 + 0.1 * rank),
      }
    }

    const count = Math.round(entry.count * DENSITY_MULT)
    const positions = formation(entry.formation, count, STAGE_W)
    for (let i = 0; i < count; i++) {
      const enemy = this.enemies.find((e) => !e.active)
      if (!enemy) break
      const [x, y] = positions[i]
      enemy.activate(x, y, def, entry.path, playerX, tex)
    }
  }

  update(dt: number, enemyBullets: BulletPool, playerX: number, playerY: number, stageH: number)
    : { spawnBoss: boolean; activeLasers: Array<{ x: number; fromY: number }> } {
    this.elapsed += dt

    while (
      this.nextWaveIdx < this.waves.length &&
      this.elapsed >= this.waves[this.nextWaveIdx].time
    ) {
      this.spawnWave(this.waves[this.nextWaveIdx], playerX)
      this.nextWaveIdx++
    }

    const activeLasers: Array<{ x: number; fromY: number }> = []
    for (const e of this.enemies) {
      if (!e.active) continue
      e.update(dt, enemyBullets, stageH, playerX, playerY)
      const laser = e.activeLaser
      if (laser) activeLasers.push(laser)
    }

    const spawnBoss = !this.bossTriggered && this.elapsed >= this.bossTriggerTime
    if (spawnBoss) this.bossTriggered = true
    return { spawnBoss, activeLasers }
  }

  get activeEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.active)
  }

  dismissAll() {
    for (const e of this.enemies) e.deactivate()
  }
}

function formation(
  type: WaveEntry['formation'],
  count: number,
  stageW: number,
): [number, number][] {
  const out: [number, number][] = []
  // Wide battlefields (landscape stages) spread formations further apart
  const spacing = Math.min(Math.max(70, stageW / 8), (stageW - 100) / Math.max(count - 1, 1))

  switch (type) {
    case 'line-top': {
      const totalW = spacing * (count - 1)
      const startX = (stageW - totalW) / 2
      for (let i = 0; i < count; i++) out.push([startX + i * spacing, -30])
      break
    }
    case 'line-left':
      for (let i = 0; i < count; i++) out.push([-30, 80 + i * 55])
      break
    case 'line-right':
      for (let i = 0; i < count; i++) out.push([stageW + 30, 80 + i * 55])
      break
    case 'v-shape': {
      const half = Math.floor(count / 2)
      const arm = Math.max(55, stageW / 10)
      for (let i = 0; i < count; i++) {
        const side = i < half ? i : count - 1 - i
        const x = (stageW / 2) + (i < half ? -1 : 1) * side * arm
        out.push([x, -30 - side * 20])
      }
      break
    }
  }
  return out
}
