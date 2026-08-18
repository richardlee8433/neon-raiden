import { SFX, SFX_DIR, SfxDef } from '../data/audio'

// Decoded one-shot playback. Samples are fetched as bytes up front (which
// needs no AudioContext, so it can run before the user has touched the page)
// and decoded the moment a context first exists.
//
// SFX are held as decoded AudioBuffers rather than streamed: they need
// sample-accurate latency, overlapping voices, and per-trigger pitch, none of
// which an <audio> element gives you. Music goes the other way — see
// MusicSystem — because decoding minutes of BGM would cost tens of MB of RAM.

/** Hard cap on overlapping voices; a bomb can kill 40 enemies on one frame. */
const MAX_VOICES = 24

class SampleBank {
  private raw = new Map<string, ArrayBuffer>()
  private buffers = new Map<string, AudioBuffer>()
  private lastPlayed = new Map<string, number>()
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private voices = 0
  private fetching: Promise<void> | null = null
  private decoding: Promise<void> | null = null

  private get files(): string[] {
    return [...new Set(Object.values(SFX).map((d) => d.src))]
  }

  /** Pull every sample over the network. Safe to call at load time. */
  prefetch(): Promise<void> {
    if (!this.fetching) {
      this.fetching = Promise.all(
        this.files.map(async (src) => {
          const res = await fetch(SFX_DIR + src)
          if (!res.ok) throw new Error(`sfx ${src}: HTTP ${res.status}`)
          this.raw.set(src, await res.arrayBuffer())
        }),
      ).then(() => {})
    }
    return this.fetching
  }

  /** Bind to a live context and decode. Idempotent. */
  attach(ctx: AudioContext): Promise<void> {
    if (this.decoding) return this.decoding
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.connect(ctx.destination)

    this.decoding = this.prefetch().then(async () => {
      await Promise.all(
        this.files.map(async (src) => {
          const bytes = this.raw.get(src)
          if (!bytes) return
          // decodeAudioData detaches its input, so hand it a copy — a failed
          // decode would otherwise leave nothing to retry with.
          this.buffers.set(src, await ctx.decodeAudioData(bytes.slice(0)))
        }),
      )
      this.raw.clear()
    })
    return this.decoding
  }

  get ready() { return this.buffers.size > 0 }

  /**
   * Fires one voice. `rate` multiplies playback speed (and so pitch); it is
   * how the gem streak climbs in semitones.
   */
  play(def: SfxDef, rate = 1, gainMult = 1) {
    const buf = this.buffers.get(def.src)
    if (!buf || !this.ctx || !this.master) return
    if (this.voices >= MAX_VOICES) return

    const now = performance.now()
    if (def.throttleMs) {
      const last = this.lastPlayed.get(def.src) ?? -Infinity
      if (now - last < def.throttleMs) return
      this.lastPlayed.set(def.src, now)
    }

    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    if (def.detune && 'detune' in src) {
      src.detune.value = (Math.random() * 2 - 1) * def.detune
    }
    const g = this.ctx.createGain()
    g.gain.value = def.gain * gainMult
    src.connect(g)
    g.connect(this.master)

    this.voices++
    src.onended = () => { this.voices--; g.disconnect() }
    src.start()
  }
}

export const sampleBank = new SampleBank()
