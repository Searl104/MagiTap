// Canvas "3D" for Tile Walk: a fixed-pitch camera, flat-shaded boxes lit by
// point lights, painter's-order drawing and distance fog.

import { DOOR_Z, EXIT_ROW, EXIT_Z, HALF, ROW_GAP, ROWS, rowZ, tileX, type Tile, type Vec3 } from './world'

type RGB = [number, number, number]
type Light = { pos: Vec3; color: RGB; power: number }

const FOG: RGB = [8, 5, 18]
const AMBIENT: RGB = [0.05, 0.045, 0.09]
const STONE: RGB = [150, 138, 172]
const PILLAR: RGB = [90, 80, 112]
const WARM: RGB = [255, 196, 128]
const COOL: RGB = [150, 205, 255]

const CAM_HEIGHT = 2.3
export const CAM_BACK = 2.4
const PITCH = Math.atan2(CAM_HEIGHT, 4.6)
const FALL_LIFE = 1.2

export type Camera = { z: number; f: number; cx: number; cy: number; w: number; h: number; cos: number; sin: number }

export function makeCamera(w: number, h: number, z: number): Camera {
  return { z, w, h, f: Math.min(w, h * 0.62) * 0.95, cx: w / 2, cy: h * 0.5, cos: Math.cos(PITCH), sin: Math.sin(PITCH) }
}

/** Screen x, y and view depth, or null when behind the camera. */
export function project(c: Camera, p: Vec3): Vec3 | null {
  const vy = p[1] - CAM_HEIGHT
  const vz = p[2] - c.z
  const z = vz * c.cos - vy * c.sin
  if (z < 0.15) return null
  const y = vy * c.cos + vz * c.sin
  return [c.cx + (c.f * p[0]) / z, c.cy - (c.f * y) / z, z]
}

export const horizonY = (c: Camera) => c.cy - (c.f * c.sin) / c.cos

export type Mote = { x: number; y: number; z: number; drift: number }
export type Scene = {
  now: number
  rows: Tile[][]
  orb: Vec3
  orbAlpha: number
  /** Row the player may hop to next, outlined. */
  selectRow: number | null
  /** Trap being stood on, shaking before it drops. */
  shaking: { row: number; col: number } | null
  motes: Mote[]
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const fogAt = (depth: number) => Math.min(1, Math.max(0, (depth - 3) / 11))

function lightAt(lights: Light[], p: Vec3): RGB {
  const l: RGB = [...AMBIENT]
  for (const L of lights) {
    const dx = p[0] - L.pos[0]
    const dy = p[1] - L.pos[1]
    const dz = p[2] - L.pos[2]
    const a = L.power / (1 + (dx * dx + dy * dy + dz * dz) * 0.55)
    l[0] += (a * L.color[0]) / 255
    l[1] += (a * L.color[1]) / 255
    l[2] += (a * L.color[2]) / 255
  }
  return l
}

function shade(base: RGB, p: Vec3, k: number, lights: Light[], depth: number): RGB {
  const l = lightAt(lights, p)
  const c: RGB = [Math.min(255, base[0] * l[0] * k), Math.min(255, base[1] * l[1] * k), Math.min(255, base[2] * l[2] * k)]
  return mix(c, FOG, fogAt(depth))
}

/** Traces a polygon; false if any corner is behind the camera. */
function trace(ctx: CanvasRenderingContext2D, cam: Camera, pts: Vec3[]): Vec3[] | null {
  const sp: Vec3[] = []
  for (const p of pts) {
    const s = project(cam, p)
    if (!s) return null
    sp.push(s)
  }
  ctx.beginPath()
  ctx.moveTo(sp[0][0], sp[0][1])
  for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i][0], sp[i][1])
  ctx.closePath()
  return sp
}

type Box = { x0: number; x1: number; z0: number; z1: number; yTop: number; yBot: number }

/** A stone block: visible side, front face fading into the abyss, then the lit top. */
function drawBox(ctx: CanvasRenderingContext2D, cam: Camera, b: Box, base: RGB, lights: Light[], alpha = 1) {
  const { x0, x1, z0, z1, yTop, yBot } = b
  const cx = (x0 + x1) / 2
  ctx.globalAlpha = alpha

  // Side facing the camera (the camera sits at x = 0).
  const sideX = x1 < 0 ? x1 : x0 > 0 ? x0 : null
  if (sideX !== null) {
    const sp = trace(ctx, cam, [
      [sideX, yTop, z0],
      [sideX, yTop, z1],
      [sideX, yBot, z1],
      [sideX, yBot, z0],
    ])
    if (sp) {
      const top = shade(base, [sideX, yTop, (z0 + z1) / 2], 0.42, lights, sp[0][2])
      const g = ctx.createLinearGradient(0, sp[0][1], 0, sp[3][1])
      g.addColorStop(0, css(top))
      g.addColorStop(1, css(FOG))
      ctx.fillStyle = g
      ctx.fill()
    }
  }

  const front = trace(ctx, cam, [
    [x0, yTop, z0],
    [x1, yTop, z0],
    [x1, yBot, z0],
    [x0, yBot, z0],
  ])
  if (front) {
    const top = shade(base, [cx, yTop, z0], 0.6, lights, front[0][2])
    const g = ctx.createLinearGradient(0, front[0][1], 0, front[3][1])
    g.addColorStop(0, css(top))
    g.addColorStop(1, css(FOG))
    ctx.fillStyle = g
    ctx.fill()
  }

  const top = trace(ctx, cam, [
    [x0, yTop, z0],
    [x1, yTop, z0],
    [x1, yTop, z1],
    [x0, yTop, z1],
  ])
  if (top) {
    ctx.fillStyle = css(shade(base, [cx, yTop, (z0 + z1) / 2], 1, lights, top[0][2]))
    ctx.fill()
    // Bevel: a thin bright lip on the front edge.
    ctx.strokeStyle = css(shade(base, [cx, yTop, z0], 1.35, lights, top[0][2]), 0.7)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(top[0][0], top[0][1])
    ctx.lineTo(top[1][0], top[1][1])
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawCracks(ctx: CanvasRenderingContext2D, cam: Camera, tile: Tile, x: number, y: number, z: number, alpha: number) {
  if (alpha <= 0.01) return
  const centre = project(cam, [x, y, z])
  if (!centre) return
  ctx.strokeStyle = `rgba(6, 2, 12, ${Math.min(1, alpha)})`
  ctx.lineWidth = Math.max(0.8, (cam.f * 0.018) / centre[2])
  ctx.lineJoin = 'round'
  for (const branch of tile.cracks) {
    ctx.beginPath()
    branch.forEach(([lx, lz], i) => {
      const p = project(cam, [x + lx, y + 0.001, z + lz])
      if (!p) return
      if (i === 0) ctx.moveTo(p[0], p[1])
      else ctx.lineTo(p[0], p[1])
    })
    ctx.stroke()
  }
}

function drawOrb(ctx: CanvasRenderingContext2D, cam: Camera, orb: Vec3, alpha: number, flicker: number) {
  const p = project(cam, orb)
  if (!p || alpha <= 0) return
  const r = (cam.f * 0.14) / p[2]
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha

  // Pool of light on the surface below.
  const floor = project(cam, [orb[0], 0, orb[2]])
  if (floor && orb[1] > 0) {
    const pr = r * 3.2
    const pool = ctx.createRadialGradient(floor[0], floor[1], 0, floor[0], floor[1], pr)
    pool.addColorStop(0, `rgba(255, 180, 110, ${0.35 * flicker})`)
    pool.addColorStop(1, 'rgba(255, 180, 110, 0)')
    ctx.fillStyle = pool
    ctx.beginPath()
    ctx.ellipse(floor[0], floor[1], pr, pr * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  const halo = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 5)
  halo.addColorStop(0, `rgba(255, 190, 120, ${0.45 * flicker})`)
  halo.addColorStop(1, 'rgba(255, 190, 120, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(p[0] - r * 5, p[1] - r * 5, r * 10, r * 10)

  const core = ctx.createRadialGradient(p[0], p[1] - r * 0.3, 0, p[0], p[1], r)
  core.addColorStop(0, '#fffaf0')
  core.addColorStop(0.5, '#ffd28a')
  core.addColorStop(1, 'rgba(255, 140, 60, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function drawExit(ctx: CanvasRenderingContext2D, cam: Camera, lights: Light[], now: number) {
  drawBox(ctx, cam, { x0: -2.2, x1: 2.2, z0: EXIT_Z - HALF, z1: DOOR_Z + 1, yTop: 0, yBot: -5 }, STONE, lights)

  // Wall with a glowing doorway.
  const wall = trace(ctx, cam, [
    [-3.5, 4, DOOR_Z],
    [3.5, 4, DOOR_Z],
    [3.5, 0, DOOR_Z],
    [-3.5, 0, DOOR_Z],
  ])
  if (wall) {
    // Dark stone, only faintly catching the door light near the floor.
    const g = ctx.createLinearGradient(0, wall[0][1], 0, wall[3][1])
    g.addColorStop(0, css(FOG))
    g.addColorStop(1, css(mix(FOG, [60, 75, 110], 0.6)))
    ctx.fillStyle = g
    ctx.fill()
  }
  const arch: Vec3[] = [[-0.55, 0, DOOR_Z]]
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI - (i / 10) * Math.PI
    arch.push([Math.cos(a) * 0.55, 1.25 + Math.sin(a) * 0.55, DOOR_Z])
  }
  arch.push([0.55, 0, DOOR_Z])
  const door = trace(ctx, cam, arch)
  if (!door) return
  const top = door[6]
  const bottom = door[0]
  const pulse = 0.85 + 0.15 * Math.sin(now * 1.7)
  const g = ctx.createLinearGradient(0, top[1], 0, bottom[1])
  g.addColorStop(0, `rgba(200, 230, 255, ${pulse})`)
  g.addColorStop(1, '#ffffff')
  ctx.fillStyle = g
  ctx.fill()

  // Light spilling out of the door, visible from the far end as a beacon.
  const c = project(cam, [0, 0.9, DOOR_Z])
  if (!c) return
  const r = (cam.f * 2.6) / c[2]
  const glow = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r)
  glow.addColorStop(0, `rgba(150, 205, 255, ${0.4 * pulse})`)
  glow.addColorStop(1, 'rgba(150, 205, 255, 0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = glow
  ctx.fillRect(c[0] - r, c[1] - r, r * 2, r * 2)
  ctx.globalCompositeOperation = 'source-over'
}

export function drawScene(ctx: CanvasRenderingContext2D, cam: Camera, s: Scene) {
  const { now } = s
  ctx.fillStyle = css(FOG)
  ctx.fillRect(0, 0, cam.w, cam.h)

  const flicker = 0.9 + 0.06 * Math.sin(now * 13.1) + 0.04 * Math.sin(now * 29.7 + 1.3)
  const orbLight: Light = { pos: s.orb, color: WARM, power: 1.7 * flicker * s.orbAlpha }
  const lights: Light[] = [orbLight, { pos: [0, 1.2, DOOR_Z - 0.4], color: COOL, power: 3.2 }]
  const orbSlot = Math.max(0, Math.min(EXIT_ROW, Math.round(s.orb[2] / ROW_GAP)))

  drawExit(ctx, cam, lights, now)
  if (orbSlot === EXIT_ROW) drawOrb(ctx, cam, s.orb, s.orbAlpha, flicker)

  for (let row = ROWS; row >= 1; row--) {
    const z = rowZ(row)
    if (z + HALF < cam.z) continue

    // Pillars flanking the walk on every other row.
    if (row % 2 === 0) {
      for (const side of [-1, 1]) {
        const x = side * 3.1
        drawBox(ctx, cam, { x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35, yTop: 4, yBot: -5 }, PILLAR, lights)
      }
    }

    // Outer tiles first so inner ones overlap their sides correctly.
    const order = [...s.rows[row - 1]].sort((a, b) => Math.abs(tileX(b.col)) - Math.abs(tileX(a.col)))
    for (const tile of order) {
      let x = tileX(tile.col)
      let y = 0
      let alpha = 1
      if (tile.fallT !== null) {
        const t = now - tile.fallT
        if (t > FALL_LIFE) continue
        y = -4.5 * t * t
        alpha = 1 - t / FALL_LIFE
      }
      const shaking = s.shaking && s.shaking.row === row && s.shaking.col === tile.col
      if (shaking) x += Math.sin(now * 90) * 0.025
      drawBox(ctx, cam, { x0: x - HALF, x1: x + HALF, z0: z - HALF, z1: z + HALF, yTop: y, yBot: y - 4 }, STONE, lights, alpha)

      // Cracks only appear once it's too late: under your feet, then falling.
      if (tile.trap && (shaking || tile.fallT !== null)) drawCracks(ctx, cam, tile, x, y, z, alpha)
      if (row === s.selectRow && tile.fallT === null) {
        const sp = trace(ctx, cam, [
          [x - HALF, 0.002, z - HALF],
          [x + HALF, 0.002, z - HALF],
          [x + HALF, 0.002, z + HALF],
          [x - HALF, 0.002, z + HALF],
        ])
        if (sp) {
          ctx.strokeStyle = `rgba(255, 210, 150, ${0.22 + 0.12 * Math.sin(now * 3)})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    }
    if (orbSlot === row) drawOrb(ctx, cam, s.orb, s.orbAlpha, flicker)
  }

  // Start ledge. Too big to flat-shade by the orb, so the orb's light pool lights it instead.
  drawBox(ctx, cam, { x0: -1.9, x1: 1.9, z0: -0.8, z1: HALF, yTop: 0, yBot: -5 }, PILLAR, lights.slice(1))
  if (orbSlot === 0) drawOrb(ctx, cam, s.orb, s.orbAlpha, flicker)

  // Dust drifting through the light.
  ctx.globalCompositeOperation = 'lighter'
  for (const m of s.motes) {
    const p = project(cam, [m.x, m.y, m.z])
    if (!p) continue
    const l = lightAt(lights, [m.x, m.y, m.z])
    const a = Math.min(0.8, 0.08 + (l[0] + l[2]) * 0.3) * (1 - fogAt(p[2]))
    ctx.fillStyle = `rgba(255, 230, 200, ${a})`
    const r = Math.max(0.6, (cam.f * 0.012) / p[2])
    ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'source-over'
}

/** Screen position of a tile's centre, for tap picking. */
export const tileScreen = (cam: Camera, row: number, col: number) => project(cam, [tileX(col), 0, rowZ(row)])

