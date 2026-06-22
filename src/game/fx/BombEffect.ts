import { Container, Graphics } from 'pixi.js'

export class BombEffect {
  private overlay: Graphics
  private timer = 0
  private active = false

  constructor(container: Container, private stageW: number, private stageH: number) {
    this.overlay = new Graphics()
    this.overlay.rect(0, 0, stageW, stageH).fill({ color: 0xffffff })
    this.overlay.alpha = 0
    container.addChild(this.overlay)
  }

  trigger() {
    this.active = true
    this.timer = 0.45
    this.overlay.alpha = 0.85
  }

  update(dt: number) {
    if (!this.active) return
    this.timer -= dt
    this.overlay.alpha = Math.max(0, this.timer / 0.45) * 0.85
    if (this.timer <= 0) {
      this.active = false
      this.overlay.alpha = 0
    }
  }

  get isActive() { return this.active }
}
