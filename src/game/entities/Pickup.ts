import { Container, Sprite, Texture, Rectangle } from 'pixi.js'
import { gameStore } from '../../store/gameStore'

export type PickupType = 'power' | 'bomb'

interface PickupInstance {
  sprite: Sprite
  active: boolean
  type: PickupType
}

const FALL_SPEED = 80
const COLLECT_RADIUS = 28

export class PickupPool {
  private pool: PickupInstance[] = []

  constructor(
    private container: Container,
    private texPower: Texture,
    private texBomb: Texture,
    size = 20,
  ) {
    for (let i = 0; i < size; i++) {
      const sprite = new Sprite(texPower)
      sprite.anchor.set(0.5)
      sprite.scale.set(1.8)
      sprite.visible = false
      container.addChild(sprite)
      this.pool.push({ sprite, active: false, type: 'power' })
    }
  }

  spawn(x: number, y: number, type: PickupType) {
    const inst = this.pool.find((p) => !p.active)
    if (!inst) return
    inst.active = true
    inst.type = type
    inst.sprite.texture = type === 'power' ? this.texPower : this.texBomb
    inst.sprite.x = x
    inst.sprite.y = y
    inst.sprite.visible = true
    inst.sprite.alpha = 1
  }

  update(dt: number, playerX: number, playerY: number, stageH: number) {
    for (const inst of this.pool) {
      if (!inst.active) continue
      inst.sprite.y += FALL_SPEED * dt
      inst.sprite.alpha = 0.7 + 0.3 * Math.sin(Date.now() / 200)

      const dx = inst.sprite.x - playerX
      const dy = inst.sprite.y - playerY
      if (Math.sqrt(dx * dx + dy * dy) < COLLECT_RADIUS) {
        const store = gameStore.getState()
        if (inst.type === 'power') store.addPower(1)
        else store.useBomb  // give bomb back
        if (inst.type === 'bomb') gameStore.setState((s) => ({ bombs: Math.min(5, s.bombs + 1) }))
        inst.active = false
        inst.sprite.visible = false
        continue
      }

      if (inst.sprite.y > stageH + 30) {
        inst.active = false
        inst.sprite.visible = false
      }
    }
  }

  releaseAll() {
    for (const inst of this.pool) {
      inst.active = false
      inst.sprite.visible = false
    }
  }
}
