import { blip, noise } from '../../lib/audio'

/** Low, slowly breathing dungeon hum. Returns a stop function. */
export function startDrone(ctx: AudioContext): () => void {
  const out = ctx.createGain()
  out.gain.setValueAtTime(0.0001, ctx.currentTime)
  out.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 3)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 260
  filter.Q.value = 5
  filter.connect(out).connect(ctx.destination)

  const lfo = ctx.createOscillator()
  const lfoAmt = ctx.createGain()
  lfo.frequency.value = 0.07
  lfoAmt.gain.value = 140
  lfo.connect(lfoAmt).connect(filter.frequency)

  const voices = [
    { type: 'sawtooth' as const, freq: 55 },
    { type: 'sawtooth' as const, freq: 55.35 },
    { type: 'sine' as const, freq: 82.4 },
  ].map(({ type, freq }) => {
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    o.connect(filter)
    return o
  })
  ;[lfo, ...voices].forEach((o) => o.start())

  return () => {
    const t = ctx.currentTime
    out.gain.setTargetAtTime(0.0001, t, 0.2)
    ;[lfo, ...voices].forEach((o) => o.stop(t + 1))
  }
}

export const hopSound = (ctx: AudioContext) =>
  blip(ctx, ctx.currentTime, { freq: 260, to: 520, dur: 0.18, gain: 0.12, type: 'sine' })

export function landSound(ctx: AudioContext) {
  const t = ctx.currentTime
  blip(ctx, t, { freq: 130, to: 55, dur: 0.18, gain: 0.45, type: 'sine' })
  noise(ctx, t, { dur: 0.08, gain: 0.15, freq: 900 })
}

export function crackSound(ctx: AudioContext) {
  const t = ctx.currentTime
  noise(ctx, t, { dur: 0.35, gain: 0.35, freq: 3500, to: 400 })
  blip(ctx, t, { freq: 90, to: 40, dur: 0.3, gain: 0.3, type: 'square' })
}

export function fallSound(ctx: AudioContext) {
  const t = ctx.currentTime
  blip(ctx, t, { freq: 420, to: 60, dur: 1.1, gain: 0.14, type: 'sine' })
  noise(ctx, t, { dur: 1.0, gain: 0.3, freq: 500, to: 80 })
}

export function escapeSound(ctx: AudioContext) {
  const t = ctx.currentTime
  ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) =>
    blip(ctx, t + i * 0.11, { freq, dur: 0.9, gain: 0.16, type: 'triangle' }),
  )
}
