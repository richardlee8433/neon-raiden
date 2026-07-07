import { gameStore } from '../../store/gameStore'

// Synthesized chiptune BGM — no audio files, everything is scheduled live
// on the Web Audio clock. A 4-bar loop (Am → F → C → G) at 168 BPM:
// triangle bass on 16ths, square-wave arpeggio lead, sine-sweep kick,
// noise snare/hats. Volume follows the store's soundEnabled flag.

const BPM = 168
const STEP = 60 / BPM / 4          // one 16th note, seconds
const STEPS_PER_BAR = 16
const BARS = 4
const LOOP = STEPS_PER_BAR * BARS  // 64 steps

const MASTER_LEVEL = 0.3
const LOOKAHEAD = 0.12             // seconds of audio scheduled ahead
const TICK_MS = 30

function noteHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// Chord roots per bar: A1, F1, C2, G1
const BASS_ROOTS = [33, 29, 36, 31]

// Lead arpeggio, one entry per step (0 = rest), two octaves up from roots.
// Bars: Am (A4 C5 E5), F (F4 A4 C5), C (C4 E4 G4→C5), G (G4 B4 D5)
const LEAD: number[] = [
  // Am
  69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 0, 81, 0, 76, 72,
  // F
  65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 69, 0, 77, 0, 72, 69,
  // C
  72, 0, 67, 0, 64, 0, 67, 0, 72, 0, 76, 0, 79, 0, 76, 72,
  // G
  67, 0, 71, 0, 74, 0, 71, 0, 79, 0, 74, 0, 71, 74, 76, 78,
]

class MusicSystem {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private step = 0
  private nextTime = 0

  constructor() {
    gameStore.subscribe((s, prev) => {
      if (s.soundEnabled !== prev.soundEnabled && this.master && this.ctx) {
        this.master.gain.setTargetAtTime(
          s.soundEnabled ? MASTER_LEVEL : 0,
          this.ctx.currentTime, 0.05,
        )
      }
    })
  }

  get playing() { return this.timer !== null }

  start() {
    if (this.timer) return
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ??
        (window as any).webkitAudioContext)()
      this.master = this.ctx.createGain()
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') this.ctx.resume()
    this.master!.gain.value = gameStore.getState().soundEnabled ? MASTER_LEVEL : 0

    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.05
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    // let already-scheduled notes ring out; just fade the master
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15)
    }
  }

  private tick() {
    if (!this.ctx) return
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step % LOOP, this.nextTime)
      this.nextTime += STEP
      this.step++
    }
    // restore master after a stop→start cycle faded it
    if (this.master && gameStore.getState().soundEnabled &&
        this.master.gain.value < MASTER_LEVEL * 0.9) {
      this.master.gain.setTargetAtTime(MASTER_LEVEL, this.ctx.currentTime, 0.1)
    }
  }

  private scheduleStep(step: number, t: number) {
    const bar = Math.floor(step / STEPS_PER_BAR)
    const beat = step % STEPS_PER_BAR

    // Kick on every beat
    if (beat % 4 === 0) this.kick(t)
    // Snare on beats 2 and 4
    if (beat === 4 || beat === 12) this.snare(t)
    // Hats on off-8ths
    if (beat % 2 === 1) this.hat(t, beat % 4 === 3 ? 0.5 : 0.28)

    // Bass: driving 16ths, octave jump on the off-beats
    const root = BASS_ROOTS[bar]
    const bassNote = beat % 4 === 2 ? root + 12 : root
    if (beat % 2 === 0) this.tone(t, noteHz(bassNote), 'triangle', 0.13, STEP * 1.7)

    // Lead arpeggio
    const lead = LEAD[step]
    if (lead > 0) this.tone(t, noteHz(lead), 'square', 0.045, STEP * 1.9)
  }

  private tone(t: number, freq: number, type: OscillatorType, vol: number, dur: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain); gain.connect(this.master!)
    osc.start(t); osc.stop(t + dur + 0.02)
  }

  private kick(t: number) {
    const ctx = this.ctx!
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.1)
    gain.gain.setValueAtTime(0.9, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    osc.connect(gain); gain.connect(this.master!)
    osc.start(t); osc.stop(t + 0.13)
  }

  private noiseBurst(t: number, dur: number, filterHz: number, vol: number, type: BiquadFilterType) {
    const ctx = this.ctx!
    const samples = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = filterHz
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(filter); filter.connect(gain); gain.connect(this.master!)
    src.start(t); src.stop(t + dur)
  }

  private snare(t: number) { this.noiseBurst(t, 0.09, 1800, 0.5, 'bandpass') }
  private hat(t: number, vol: number) { this.noiseBurst(t, 0.035, 7000, vol * 0.5, 'highpass') }
}

export const musicSystem = new MusicSystem()
