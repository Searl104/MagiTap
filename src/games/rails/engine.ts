// Game state + loop, kept outside React so the 60fps loop never re-renders.
// React only hears about phase changes, the countdown and each judgement.

import { blip, createAudio, kick, laneTone } from './audio'
import { BEAT, COUNT_IN_BEATS, LANES, POINTS, WINDOWS, buildChart, grade, type Judgement, type Note } from './chart'
import { drawFrame, laneAtX, makeGeometry, type Fx, type Geometry } from './draw'

export type Phase = 'ready' | 'countdown' | 'playing' | 'done'
export type Hud = { score: number; combo: number }
export type Results = { score: number; maxCombo: number; total: number; counts: Record<Judgement, number> }

export type Ui = {
  onPhase: (p: Phase) => void
  onCount: (label: string | null) => void
  onHud: (h: Hud) => void
  onJudge: (j: { id: number; kind: Judgement }) => void
  onResults: (r: Results) => void
}

const COUNT_LABELS = ['3', '2', '1', 'GO!']
const KEYS = ['d', 'f', 'j', 'k'] // desktop testing
const RESTART_DELAY = 0.8 // ignore frantic taps right after the last target

const emptyCounts = (): Record<Judgement, number> => ({ perfect: 0, great: 0, good: 0, miss: 0 })

export function createEngine(ui: Ui) {
  let phase: Phase = 'ready'
  let audio: AudioContext | null = null
  let startAt = 0
  let notes: Note[] = []
  let endTime = 0
  let fx: Fx[] = []
  let score = 0
  let combo = 0
  let maxCombo = 0
  let counts = emptyCounts()
  let shownCount = -1
  let doneAt = 0
  let judgeId = 0
  let geometry: Geometry = makeGeometry(1, 1)
  const pressed = new Array<number>(LANES).fill(0)
  const pointers = new Map<number, number>()

  // One clock for everything: audio time when we have sound (it waits for iOS
  // to unlock the context, so the count-in never starts silently).
  const clock = () => (audio ? audio.currentTime : performance.now() / 1000)
  // Before the first run the rails drift slowly as an attract screen.
  const songTime = () => (phase === 'ready' ? performance.now() / 2000 : clock() - startAt)

  function setPhase(p: Phase) {
    phase = p
    ui.onPhase(p)
  }

  function start() {
    if (!audio) audio = createAudio()
    void audio?.resume() // must happen inside the tap for iOS to allow sound

    notes = buildChart()
    endTime = notes[notes.length - 1].time
    fx = []
    score = combo = maxCombo = 0
    counts = emptyCounts()
    shownCount = -1
    startAt = clock() + 0.3

    if (audio) {
      const t0 = startAt
      for (let b = 0; b < COUNT_IN_BEATS; b++) {
        const go = b === COUNT_IN_BEATS - 1
        blip(audio, t0 + b * BEAT, { freq: go ? 1318.5 : 880, dur: go ? 0.3 : 0.12, gain: 0.25, type: 'square' })
      }
      // Soft metronome under the pattern, accent on each bar.
      const lastBeat = Math.ceil(endTime / BEAT)
      for (let b = COUNT_IN_BEATS; b <= lastBeat; b++) kick(audio, t0 + b * BEAT, b % 4 === 0 ? 0.5 : 0.25)
    }

    ui.onHud({ score, combo })
    ui.onCount(null)
    setPhase('countdown')
  }

  function judge(note: Note, kind: Judgement, now: number) {
    note.hit = kind
    counts[kind]++
    if (kind === 'miss') {
      combo = 0
    } else {
      combo++
      maxCombo = Math.max(maxCombo, combo)
      score += POINTS[kind]
      fx.push({ lane: note.lane, time: now })
    }
    ui.onHud({ score, combo })
    ui.onJudge({ id: ++judgeId, kind })
  }

  function press(lane: number) {
    pressed[lane]++
    if (phase !== 'countdown' && phase !== 'playing') return
    const now = songTime()
    let best: Note | null = null
    for (const n of notes) {
      if (n.lane !== lane || n.hit) continue
      if (Math.abs(n.time - now) > WINDOWS.good) continue
      if (!best || Math.abs(n.time - now) < Math.abs(best.time - now)) best = n
    }
    const kind = best && grade(best.time - now)
    if (audio) laneTone(audio, lane, kind ? 0.3 : 0.1)
    if (best && kind) judge(best, kind, now)
  }

  const release = (lane: number) => {
    pressed[lane] = Math.max(0, pressed[lane] - 1)
  }

  function tap() {
    if (phase === 'ready' || (phase === 'done' && songTime() - doneAt > RESTART_DELAY)) {
      start()
      return true
    }
    return false
  }

  function update(now: number) {
    if (phase === 'countdown') {
      const b = Math.floor(now / BEAT)
      if (b >= COUNT_IN_BEATS) {
        ui.onCount(null)
        setPhase('playing')
      } else if (now >= 0 && b !== shownCount) {
        shownCount = b
        ui.onCount(COUNT_LABELS[b])
      }
    }
    if (phase === 'countdown' || phase === 'playing') {
      for (const n of notes) if (!n.hit && now - n.time > WINDOWS.good) judge(n, 'miss', now)
    }
    if (phase === 'playing' && now > endTime + 1) {
      doneAt = now
      setPhase('done')
      ui.onResults({ score, maxCombo, total: notes.length, counts: { ...counts } })
    }
    fx = fx.filter((f) => now - f.time < 1)
  }

  /** Start drawing into `canvas`; returns a cleanup function. */
  function attach(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!
    let raf = 0

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      geometry = makeGeometry(r.width, r.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const frame = () => {
      const now = songTime()
      update(now)
      drawFrame(ctx, geometry, { now, notes, pressed, fx })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const lane = KEYS.indexOf(e.key.toLowerCase())
      if (lane >= 0 && !tap()) press(lane)
      else if (e.key === ' ' || e.key === 'Enter') tap()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const lane = KEYS.indexOf(e.key.toLowerCase())
      if (lane >= 0) release(lane)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      // Leaving the game: silence anything still scheduled.
      void audio?.close()
      audio = null
      phase = 'ready'
    }
  }

  return {
    attach,
    pointerDown(id: number, x: number) {
      if (tap()) return
      const lane = laneAtX(geometry, x)
      pointers.set(id, lane)
      press(lane)
    },
    pointerUp(id: number) {
      const lane = pointers.get(id)
      if (lane === undefined) return
      pointers.delete(id)
      release(lane)
    },
  }
}
