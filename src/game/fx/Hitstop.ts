// Freeze-frame on impact: the brain reads a few dropped frames as weight.
// Call trigger() at the moment of impact; GameApp skips gameplay updates
// while update() reports frozen.
class Hitstop {
  private remaining = 0

  trigger(seconds: number) {
    this.remaining = Math.max(this.remaining, seconds)
  }

  /** Call once per tick. Returns true while the game should stay frozen. */
  update(dt: number): boolean {
    if (this.remaining <= 0) return false
    this.remaining -= dt
    return true
  }
}

export const hitstop = new Hitstop()
