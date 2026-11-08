// Tile Walk state and loop, outside React. React hears about phase and HUD changes only.

import { createAudio } from '../../lib/audio'
import { crackSound, escapeSound, fallSound, hopSound, landSound, startDrone } from './audio'
import { CAM_BACK, drawScene, horizonY, makeCamera, tileScreen, type Camera, type Mote } from './draw'
import { DOOR_Z, EXIT_ROW, EXIT_Z, ORB_Y, ROWS, buildRows, restPos, type Tile, type Vec3 } from './world'

export type Phase = 'intro' | 'play' | 'won'
export type Hud = { row: number; attempt: number; best: number }
export type Result = { attempts: number; seconds: number }

export type Ui = {
  onPhase: (p: Phase) => void
  onHud: (h: Hud) => void
  onResult: (r: Result) => void
}

type Mode = 'intro' | 'idle' | 'hop' | 'crack' | 'fall' | 'exit' | 'won'
type Hop = { from: Vec3; to: Vec3; t0: number; row: number; col: number | null }

const HOP_TIME = 0.42
const HOP_HEIGHT = 0.6
const CRACK_TIME = 0.4
const FALL_TIME = 1.2
const EXIT_TIME = 1.6
const RESTART_DELAY = 0.8
/** Tap the next tile within this many seconds of landing and it is safe. Never shown to the player. */
const CONFIDENCE_WINDOW = 0.5

/** Moves a trap off `col` onto another standing tile in the row, keeping the row's trap count. */
function makeSafe(tiles: Tile[], col: number) {
  const tile = tiles[col]
  if (!tile.trap) return
  const swap = tiles.find((t) => !t.trap && t.fallT === null)
  if (!swap) return
  swap.trap = true
  swap.cracks = tile.cracks
  tile.trap = false
  tile.cracks = []
}

function makeMotes(): Mote[] {
  return Array.from({ length: 70 }, () => ({
    x: (Math.random() - 0.5) * 7,
    y: Math.random() * 3 - 0.8,
    z: Math.random() * 12,
    drift: 0.04 + Math.random() * 0.08,
  }))
}

export function createTileWalk(ui: Ui) {
  let mode: Mode = 'intro'
  let modeT0 = 0
  let rows: Tile[][] = buildRows()
  let row = 0
  let attempt = 1
  let best = 0
  let runStart = 0
  let orb: Vec3 = restPos(0, null)
  let orbAlpha = 1
  let hop: Hop | null = null
  let exitAt: number | null = null
  let trapAt: { row: number; col: number } | null = null
  let camera: Camera = makeCamera(1, 1, orb[2] - CAM_BACK)
  let audio: AudioContext | null = null
  let stopDrone: (() => void) | null = null
  const motes = makeMotes()

  const clock = () => performance.now() / 1000
  const sound = (play: (ctx: AudioContext) => void) => audio && play(audio)
  const hud = () => ui.onHud({ row, attempt, best })

  function setMode(m: Mode, now: number) {
    mode = m
    modeT0 = now
  }

  function start(now: number) {
    if (!audio) {
      audio = createAudio()
      if (audio) stopDrone = startDrone(audio)
    }
    void audio?.resume()
    attempt = 1
    best = 0
    runStart = now
    newAttempt(now)
    orbAlpha = 1
    ui.onPhase('play')
  }

  /** Back to the ledge, facing a freshly shuffled dungeon. */
  function newAttempt(now: number) {
    rows = buildRows()
    row = 0
    orb = restPos(0, null)
    orbAlpha = 0
    hop = null
    exitAt = null
    trapAt = null
    setMode('idle', now)
    hud()
  }

  function hopTo(targetRow: number, targetCol: number | null, now: number) {
    // The secret is confidence: commit to the next tile quickly and it holds.
    // (In idle, modeT0 is when the orb landed or the attempt began.)
    if (targetRow <= ROWS && targetCol !== null && mode === 'idle' && now - modeT0 <= CONFIDENCE_WINDOW) {
      makeSafe(rows[targetRow - 1], targetCol)
    }
    hop = { from: [...orb], to: restPos(targetRow, targetCol), t0: now, row: targetRow, col: targetCol }
    setMode('hop', now)
    sound(hopSound)
  }

  function land(h: Hop, now: number) {
    hop = null
    orb = [...h.to]
    if (h.row === EXIT_ROW) {
      setMode('exit', now)
      sound(escapeSound)
      return
    }
    const tile = rows[h.row - 1][h.col!]
    if (tile.trap) {
      trapAt = { row: h.row, col: tile.col }
      setMode('crack', now)
      sound(crackSound)
      return
    }
    row = h.row
    best = Math.max(best, row)
    setMode('idle', now)
    sound(landSound)
    hud()
    if (row === ROWS) exitAt = now + 0.45
  }

  function update(now: number, dt: number) {
    const t = now - modeT0
    if (mode === 'hop' && hop) {
      const p = Math.min(1, (now - hop.t0) / HOP_TIME)
      const e = p * p * (3 - 2 * p)
      orb = [
        hop.from[0] + (hop.to[0] - hop.from[0]) * e,
        ORB_Y + Math.sin(Math.PI * p) * HOP_HEIGHT,
        hop.from[2] + (hop.to[2] - hop.from[2]) * e,
      ]
      if (p >= 1) land(hop, now)
    } else if (mode === 'crack' && trapAt && t >= CRACK_TIME) {
      rows[trapAt.row - 1][trapAt.col].fallT = now
      setMode('fall', now)
      sound(fallSound)
    } else if (mode === 'fall') {
      orb[1] = ORB_Y - 4.5 * t * t
      orbAlpha = Math.max(0, 1 - t / FALL_TIME)
      if (t >= FALL_TIME) {
        attempt++
        newAttempt(now)
      }
    } else if (mode === 'idle') {
      orbAlpha = Math.min(1, orbAlpha + dt * 2.5)
      if (exitAt !== null && now >= exitAt) {
        exitAt = null
        hopTo(EXIT_ROW, null, now)
      }
    } else if (mode === 'exit') {
      const p = Math.min(1, t / EXIT_TIME)
      orb = [0, ORB_Y + p * 0.5, EXIT_Z + (DOOR_Z - 0.1 - EXIT_Z) * p * p]
      orbAlpha = 1 - p
      if (p >= 1) {
        setMode('won', now)
        ui.onPhase('won')
        ui.onResult({ attempts: attempt, seconds: now - runStart })
      }
    }

    // Camera glides after the orb (but stays put while it falls).
    const target = Math.min(orb[2], EXIT_Z) - CAM_BACK
    camera.z += (target - camera.z) * (1 - Math.exp(-dt * 4))

    for (const m of motes) {
      m.y += m.drift * dt
      m.x += Math.sin(now * 0.3 + m.z) * 0.02 * dt
      if (m.y > 2.4) m.y = -0.8
      if (m.z < camera.z + 0.5) m.z += 12
      if (m.z > camera.z + 12.5) m.z -= 12
    }
  }

  function tap(x: number, y: number) {
    const now = clock()
    if (mode === 'intro' || (mode === 'won' && now - modeT0 > RESTART_DELAY)) {
      start(now)
      return
    }
    if (mode !== 'idle' || row >= ROWS || exitAt !== null || y < horizonY(camera)) return
    // Pick the open tile in the next row whose column is nearest the tap.
    let best: number | null = null
    let bestDist = Infinity
    for (const tile of rows[row]) {
      if (tile.fallT !== null) continue
      const p = tileScreen(camera, row + 1, tile.col)
      if (!p) continue
      const d = Math.abs(p[0] - x)
      if (d < bestDist) {
        bestDist = d
        best = tile.col
      }
    }
    if (best !== null) hopTo(row + 1, best, now)
  }

  function pickColumn(c: number) {
    const now = clock()
    if (mode === 'intro' || mode === 'won') return tap(0, Infinity)
    if (mode === 'idle' && row < ROWS && exitAt === null && rows[row][c].fallT === null) hopTo(row + 1, c, now)
  }

  function attach(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = clock()

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      camera = makeCamera(r.width, r.height, camera.z)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const frame = () => {
      const now = clock()
      const dt = Math.min(0.05, now - last)
      last = now
      update(now, dt)
      drawScene(ctx, camera, {
        now,
        rows,
        orb,
        orbAlpha,
        selectRow: mode === 'idle' && exitAt === null && row < ROWS ? row + 1 : null,
        shaking: mode === 'crack' ? trapAt : null,
        motes,
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const c = ['1', '2', '3', '4'].indexOf(e.key)
      if (c >= 0) pickColumn(c)
      else if (e.key === ' ' || e.key === 'Enter') tap(0, Infinity)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      stopDrone?.()
      const a = audio
      setTimeout(() => void a?.close(), 1200) // let the drone fade first
      audio = null
      stopDrone = null
    }
  }

  return { attach, tap }
}
