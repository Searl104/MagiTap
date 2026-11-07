// Canvas renderer for the four perspective rails.
//
// Depth `z` is measured in "lead units": a target at z = 1 is LEAD seconds
// away from the hit line (z = 0). Points project toward a vanishing point
// with scale s = 1 / (1 + K·z).

import { BEAT, LANES, type Note } from './chart'

export const LANE_COLORS = ['#ff5c9a', '#ffc24d', '#4de3ff', '#b38bff']

export const LEAD = 1.2 // seconds per depth unit
const K = 2.5 // perspective strength
const Z_FAR = 1.6 // targets appear this deep (~1.9 s ahead)
const Z_NEAR = -0.1 // track runs slightly past the hit line
const NOTE_DEPTH = 0.045
const FX_LIFE = 0.35

export type Geometry = { w: number; h: number; cx: number; vy: number; hitY: number; halfW: number }
export type Fx = { lane: number; time: number }
export type Frame = { now: number; notes: Note[]; pressed: number[]; fx: Fx[] }

export function makeGeometry(w: number, h: number): Geometry {
  return { w, h, cx: w / 2, vy: h * 0.06, hitY: h * 0.8, halfW: Math.min(w * 0.48, h * 0.32) }
}

/** Which lane a touch belongs to, judged by where it falls across the hit line. */
export function laneAtX(g: Geometry, x: number): number {
  const lane = Math.floor((x - (g.cx - g.halfW)) / (g.halfW * (2 / LANES)))
  return Math.min(LANES - 1, Math.max(0, lane))
}

const scaleAt = (z: number) => 1 / (1 + K * z)
const laneEdge = (lane: number) => -1 + lane * (2 / LANES)
const fog = (z: number) => Math.min(1, Math.max(0, (Z_FAR - z) / 0.35))

/** Screen point for a horizontal position `e` (-1 … 1 across the track) at depth `z`. */
function pt(g: Geometry, e: number, z: number): [number, number] {
  const s = scaleAt(z)
  return [g.cx + e * g.halfW * s, g.vy + (g.hitY - g.vy) * s]
}

function quad(ctx: CanvasRenderingContext2D, g: Geometry, e0: number, e1: number, z0: number, z1: number) {
  ctx.beginPath()
  ctx.moveTo(...pt(g, e0, z0))
  ctx.lineTo(...pt(g, e1, z0))
  ctx.lineTo(...pt(g, e1, z1))
  ctx.lineTo(...pt(g, e0, z1))
  ctx.closePath()
}

function line(ctx: CanvasRenderingContext2D, a: [number, number], b: [number, number]) {
  ctx.beginPath()
  ctx.moveTo(...a)
  ctx.lineTo(...b)
  ctx.stroke()
}

export function drawFrame(ctx: CanvasRenderingContext2D, g: Geometry, f: Frame) {
  const laneW = 2 / LANES
  const farY = pt(g, 0, Z_FAR)[1]
  ctx.clearRect(0, 0, g.w, g.h)

  // Glow where the rails come from.
  const glow = ctx.createRadialGradient(g.cx, farY, 0, g.cx, farY, g.halfW * 1.1)
  glow.addColorStop(0, 'rgba(255, 190, 255, 0.35)')
  glow.addColorStop(1, 'rgba(255, 190, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, g.w, g.hitY)

  // Track surface.
  const surface = ctx.createLinearGradient(0, farY, 0, g.hitY)
  surface.addColorStop(0, 'rgba(10, 3, 30, 0.1)')
  surface.addColorStop(1, 'rgba(10, 3, 30, 0.8)')
  ctx.fillStyle = surface
  quad(ctx, g, -1, 1, Z_NEAR, Z_FAR)
  ctx.fill()

  // Beams up the lanes being held.
  for (let lane = 0; lane < LANES; lane++) {
    if (!f.pressed[lane]) continue
    const beam = ctx.createLinearGradient(0, g.hitY, 0, pt(g, 0, 0.9)[1])
    beam.addColorStop(0, LANE_COLORS[lane] + '66')
    beam.addColorStop(1, LANE_COLORS[lane] + '00')
    ctx.fillStyle = beam
    quad(ctx, g, laneEdge(lane), laneEdge(lane) + laneW, Z_NEAR, 0.9)
    ctx.fill()
  }

  // Beat lines scrolling toward the player (brighter on the downbeat).
  const firstBeat = Math.ceil((f.now + Z_NEAR * LEAD) / BEAT)
  const lastBeat = Math.floor((f.now + Z_FAR * LEAD) / BEAT)
  for (let b = firstBeat; b <= lastBeat; b++) {
    const z = (b * BEAT - f.now) / LEAD
    const bar = ((b % 4) + 4) % 4 === 0
    ctx.strokeStyle = `rgba(255, 247, 214, ${(bar ? 0.35 : 0.14) * fog(z)})`
    ctx.lineWidth = (bar ? 2 : 1) * scaleAt(z) * 1.5
    line(ctx, pt(g, -1, z), pt(g, 1, z))
  }

  // Rails.
  for (let i = 0; i <= LANES; i++) {
    const e = laneEdge(i)
    const outer = i === 0 || i === LANES
    const rail = ctx.createLinearGradient(0, farY, 0, g.hitY)
    rail.addColorStop(0, 'rgba(255, 220, 255, 0)')
    rail.addColorStop(1, outer ? 'rgba(255, 220, 255, 0.9)' : 'rgba(255, 220, 255, 0.35)')
    ctx.strokeStyle = rail
    ctx.lineWidth = outer ? 3 : 1.5
    line(ctx, pt(g, e, Z_NEAR), pt(g, e, Z_FAR))
  }

  // Hit line, with a soft glow under it.
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255, 247, 214, 0.25)'
  ctx.lineWidth = 12
  line(ctx, pt(g, -1, 0), pt(g, 1, 0))
  ctx.strokeStyle = '#fff7d6'
  ctx.lineWidth = 3
  line(ctx, pt(g, -1, 0), pt(g, 1, 0))
  ctx.lineCap = 'butt'

  // Lane pads on the hit line.
  const padRx = g.halfW * laneW * 0.36
  for (let lane = 0; lane < LANES; lane++) {
    const [x, y] = pt(g, laneEdge(lane) + laneW / 2, 0)
    ctx.beginPath()
    ctx.ellipse(x, y, padRx, padRx * 0.32, 0, 0, Math.PI * 2)
    ctx.fillStyle = f.pressed[lane] ? LANE_COLORS[lane] : 'rgba(10, 3, 30, 0.6)'
    ctx.fill()
    ctx.strokeStyle = LANE_COLORS[lane]
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  // Targets, far to near so nearer ones paint on top.
  for (let i = f.notes.length - 1; i >= 0; i--) {
    const n = f.notes[i]
    if (n.hit && n.hit !== 'miss') continue
    const z = (n.time - f.now) / LEAD
    if (z > Z_FAR || z < Z_NEAR) continue
    const fade = z < 0 ? 1 - z / Z_NEAR : 1
    ctx.globalAlpha = fog(z) * fade * (n.hit === 'miss' ? 0.3 : 1)
    const e0 = laneEdge(n.lane) + laneW * 0.08
    const e1 = laneEdge(n.lane) + laneW * 0.92
    quad(ctx, g, e0, e1, z, z + NOTE_DEPTH)
    ctx.fillStyle = LANE_COLORS[n.lane]
    ctx.fill()
    ctx.strokeStyle = '#ffffffcc'
    ctx.lineWidth = 2 * scaleAt(z)
    line(ctx, pt(g, e0, z + NOTE_DEPTH), pt(g, e1, z + NOTE_DEPTH))
  }
  ctx.globalAlpha = 1

  // Hit bursts: expanding rings on the pad.
  for (const fx of f.fx) {
    const p = (f.now - fx.time) / FX_LIFE
    if (p < 0 || p > 1) continue
    const [x, y] = pt(g, laneEdge(fx.lane) + laneW / 2, 0)
    const r = padRx * (1 + p * 1.4)
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2)
    ctx.strokeStyle = LANE_COLORS[fx.lane]
    ctx.globalAlpha = 1 - p
    ctx.lineWidth = 6 * (1 - p) + 1
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
