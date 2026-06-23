import { Container } from 'pixi.js'

class ScreenShake {
  private intensity = 0
  private readonly decay = 14

  trigger(amount: number) {
    this.intensity = Math.max(this.intensity, amount)
  }

  update(dt: number, stage: Container) {
    if (this.intensity < 0.15) {
      stage.x = 0
      stage.y = 0
      this.intensity = 0
      return
    }
    stage.x = (Math.random() * 2 - 1) * this.intensity
    stage.y = (Math.random() * 2 - 1) * this.intensity
    this.intensity -= this.decay * dt
  }
}

export const screenShake = new ScreenShake()
