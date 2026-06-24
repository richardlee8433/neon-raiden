import { gameStore } from '../../store/gameStore'

class AudioSystem {
  private ctx: AudioContext | null = null
  private shootThrottle = 0   // epoch ms of last shoot sound

  private get enabled(): boolean {
    return gameStore.getState().soundEnabled
  }

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ??
        (window as any).webkitAudioContext)()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  // ── Shoot (laser chirp) ─────────────────────────────────────────────────
  playShoot(power = 0) {
    const now = Date.now()
    if (now - this.shootThrottle < 75) return   // max ~13 beeps/s
    this.shootThrottle = now

    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const freq = 700 + power * 55

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.08)
    gain.gain.setValueAtTime(0.10, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  // ── Explosion ───────────────────────────────────────────────────────────
  playExplosion(size: 'small' | 'large' | 'boss' = 'small') {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    const dur      = size === 'small' ? 0.22 : size === 'large' ? 0.45 : 0.75
    const cutoff   = size === 'small' ? 1800 : size === 'large' ?  700 : 350
    const vol      = size === 'small' ?  0.28 : size === 'large' ? 0.45 : 0.60

    // White-noise burst
    const samples = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buf

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cutoff

    const gn = ctx.createGain()
    gn.gain.setValueAtTime(vol, t)
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    noise.connect(lp); lp.connect(gn); gn.connect(ctx.destination)
    noise.start(t); noise.stop(t + dur)

    // Low-frequency thump for large / boss
    if (size !== 'small') {
      const osc = ctx.createOscillator()
      const og  = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(90, t)
      osc.frequency.exponentialRampToValueAtTime(25, t + dur * 0.5)
      og.gain.setValueAtTime(0.4, t)
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5)
      osc.connect(og); og.connect(ctx.destination)
      osc.start(t); osc.stop(t + dur * 0.5)
    }
  }

  // ── Pickup ──────────────────────────────────────────────────────────────
  playPickup(type: 'power' | 'bomb' | 'life') {
    const ctx = this.getCtx()
    if (!ctx) return
    const freqs = type === 'power' ? [523, 659, 784]   // C E G  — bright arpeggio
                : type === 'life'  ? [659, 784, 1047]  // E G C  — joyful high
                : [392, 494, 587]                       // G B D  — deeper arpeggio

    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.06
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t); osc.stop(t + 0.14)
    })
  }

  // ── Bomb (screen-clear) ─────────────────────────────────────────────────
  playBomb() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    // Deep sawtooth rumble
    const osc = ctx.createOscillator()
    const og  = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(65, t)
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.5)
    og.gain.setValueAtTime(0.4, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(og); og.connect(ctx.destination)
    osc.start(t); osc.stop(t + 0.5)

    // Wide noise burst
    const samples = Math.floor(ctx.sampleRate * 0.4)
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 350
    bp.Q.value = 0.4
    const gn = ctx.createGain()
    gn.gain.setValueAtTime(0.55, t)
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    noise.connect(bp); bp.connect(gn); gn.connect(ctx.destination)
    noise.start(t); noise.stop(t + 0.4)
  }

  // ── Player hit ──────────────────────────────────────────────────────────
  playPlayerHit() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime

    const samples = Math.floor(ctx.sampleRate * 0.18)
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1

    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 500
    const gn = ctx.createGain()
    gn.gain.setValueAtTime(0.5, t)
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    noise.connect(lp); lp.connect(gn); gn.connect(ctx.destination)
    noise.start(t); noise.stop(t + 0.2)
  }

  // ── Boss hurt ───────────────────────────────────────────────────────────
  playBossHurt() {
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(280, t)
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.09)
    gain.gain.setValueAtTime(0.14, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(t); osc.stop(t + 0.1)
  }
}

export const audioSystem = new AudioSystem()
