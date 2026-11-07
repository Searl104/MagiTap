// Tiny Web Audio synth. The AudioContext clock is also the game clock, so
// what you hear and what you see stay locked together.

export function createAudio(): AudioContext | null {
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AC ? new AC() : null
}

type BlipOptions = { freq: number; dur: number; gain: number; type?: OscillatorType; drop?: number }

export function blip(ctx: AudioContext, time: number, { freq, dur, gain, type = 'triangle', drop }: BlipOptions) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  if (drop) osc.frequency.exponentialRampToValueAtTime(drop, time + dur)
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.004)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  osc.connect(amp).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + dur + 0.02)
}

export const kick = (ctx: AudioContext, time: number, gain: number) =>
  blip(ctx, time, { freq: 140, drop: 45, dur: 0.14, gain, type: 'sine' })

const LANE_FREQS = [523.25, 659.25, 783.99, 987.77]

export const laneTone = (ctx: AudioContext, lane: number, gain: number) =>
  blip(ctx, ctx.currentTime, { freq: LANE_FREQS[lane], dur: 0.12, gain })
