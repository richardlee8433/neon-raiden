export interface Actions {
  moveX: number  // -1 | 0 | 1
  moveY: number  // -1 | 0 | 1
  fire: boolean
  bomb: boolean
}

export class InputSystem {
  private keys = new Set<string>()
  readonly actions: Actions = { moveX: 0, moveY: 0, fire: false, bomb: false }

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.code))
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
  }

  update() {
    const k = this.keys
    this.actions.moveX =
      (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) -
      (k.has('ArrowLeft')  || k.has('KeyA') ? 1 : 0)
    this.actions.moveY =
      (k.has('ArrowDown')  || k.has('KeyS') ? 1 : 0) -
      (k.has('ArrowUp')    || k.has('KeyW') ? 1 : 0)
    this.actions.fire = k.has('Space')
    this.actions.bomb = k.has('KeyX') || k.has('ShiftLeft')
  }

  destroy() {
    window.removeEventListener('keydown', (e) => this.keys.add(e.code))
    window.removeEventListener('keyup',   (e) => this.keys.delete(e.code))
  }
}
