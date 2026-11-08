// Tiny Web Audio synth shared by the games. Create the context inside a tap:
// iOS only lets sound start from a user gesture.

export function createAudio(): AudioContext | null {
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AC ? new AC() : null
}

type BlipOptions = { freq: number; dur: number; gain: number; type?: OscillatorType; to?: number }

/** One enveloped oscillator note, optionally sliding to frequency `to`. */
export function blip(ctx: AudioContext, time: number, { freq, dur, gain, type = 'triangle', to }: BlipOptions) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, time)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, time + dur)
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.004)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  osc.connect(amp).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + dur + 0.02)
}

type NoiseOptions = { dur: number; gain: number; freq: number; to?: number }

/** A burst of low-passed white noise (crumbles, thuds, rumbles). */
export function noise(ctx: AudioContext, time: number, { dur, gain, freq, to }: NoiseOptions) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq, time)
  if (to) filter.frequency.exponentialRampToValueAtTime(to, time + dur)
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  src.connect(filter).connect(amp).connect(ctx.destination)
  src.start(time)
}
