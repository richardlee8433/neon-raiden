import { Container, Assets, Texture } from 'pixi.js'
import { waves, WaveEntry } from '../data/waves'
import { ENEMIES } from '../data/enemies'
import { Enemy, EnemyPath } from '../entities/Enemy'
import { BulletPool } from '../entities/BulletPool'

const POOL_SIZE = 50
const BOSS_TRIGGER_TIME = 42

export class WaveSystem {
  private enemies: Enemy[] = []
  private textures = new Map<string, Texture>()
  private elapsed = 0
  private nextWaveIdx = 0
  bossTriggered = false

  constructor(private container: Container) {}

  async loadTextures() {
    for (const [key, def] of Object.entries(ENEMIES)) {
      const tex = await Assets.load(def.sprite)
      this.textures.set(key, tex)
    }
    const defaultTex = this.textures.get('fighter')!
    for (let i = 0; i < POOL_SIZE; i++) {
      this.enemies.push(new Enemy(this.container, defaultTex))
    }
  }

  private spawnWave(entry: WaveEntry, playerX: number) {
    const def = ENEMIES[entry.type]
    if (!def) return
    const tex = this.textures.get(entry.type)!
    const positions = formation(entry.formation, entry.count, 480)
    for (let i = 0; i < entry.count; i++) {
      const enemy = this.enemies.find((e) => !e.active)
      if (!enemy) break
      const [x, y] = positions[i]
      enemy.activate(x, y, def, entry.path as EnemyPath, playerX, tex)
    }
  }

  update(dt: number, enemyBullets: BulletPool, playerX: number, stageH: number): boolean {
    this.elapsed += dt

    while (
      this.nextWaveIdx < waves.length &&
      this.elapsed >= waves[this.nextWaveIdx].time
    ) {
      this.spawnWave(waves[this.nextWaveIdx], playerX)
      this.nextWaveIdx++
    }

    for (const e of this.enemies) {
      if (e.active) e.update(dt, enemyBullets, stageH, playerX)
    }

    // signal boss spawn when all normal waves done + time threshold met
    if (!this.bossTriggered && this.elapsed >= BOSS_TRIGGER_TIME) {
      this.bossTriggered = true
      return true
    }
    return false
  }

  get activeEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.active)
  }

  dismissAll() {
    for (const e of this.enemies) e.deactivate()
  }

  reset() {
    this.elapsed = 0
    this.nextWaveIdx = 0
    this.bossTriggered = false
    this.dismissAll()
  }
}

function formation(
  type: WaveEntry['formation'],
  count: number,
  stageW: number,
): [number, number][] {
  const out: [number, number][] = []
  const spacing = Math.min(70, (stageW - 80) / Math.max(count - 1, 1))

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
      for (let i = 0; i < count; i++) {
        const side = i < half ? i : count - 1 - i
        const x = (stageW / 2) + (i < half ? -1 : 1) * side * 55
        out.push([x, -30 - side * 20])
      }
      break
    }
  }
  return out
}
