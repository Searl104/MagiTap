import { blip } from '../../lib/audio'

export const kick = (ctx: AudioContext, time: number, gain: number) =>
  blip(ctx, time, { freq: 140, to: 45, dur: 0.14, gain, type: 'sine' })

const LANE_FREQS = [523.25, 659.25, 783.99, 987.77]

export const laneTone = (ctx: AudioContext, lane: number, gain: number) =>
  blip(ctx, ctx.currentTime, { freq: LANE_FREQS[lane], dur: 0.12, gain })
