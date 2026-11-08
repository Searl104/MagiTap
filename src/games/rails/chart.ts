// Timing, scoring and the test chart.

export const LANES = 4
export const BPM = 110
export const BEAT = 60 / BPM
/** Beats of "3, 2, 1, GO!" before the first target reaches the line. */
export const COUNT_IN_BEATS = 4

export type Judgement = 'perfect' | 'great' | 'good' | 'miss'

/** Max |error| in seconds for each grade; anything later than `good` is a miss. */
export const WINDOWS = { perfect: 0.045, great: 0.09, good: 0.14 } as const
export const POINTS: Record<Judgement, number> = { perfect: 300, great: 200, good: 100, miss: 0 }

export type Note = { time: number; lane: number; hit: Judgement | null }

// Test pattern, in beats after the count-in. Exercises each kind of input once.
const steps: [beat: number, lanes: number[]][] = []
const add = (beat: number, ...lanes: number[]) => steps.push([beat, lanes])

;[0, 1, 2, 3, 3, 2, 1, 0].forEach((lane, i) => add(i, lane)) // quarter-note sweep
;[0, 2, 1, 3, 0, 2, 1, 3].forEach((lane, i) => add(8 + i / 2, lane)) // eighth-note zig-zag
;[[0, 3], [1, 2], [0, 3], [1, 2], [0, 1], [2, 3], [0, 2], [1, 3]].forEach((lanes, i) => add(12 + i, ...lanes)) // two-thumb chords
for (let i = 0; i < 8; i++) add(20 + i / 2, i % 2 ? 2 : 1) // inner trill
for (let i = 0; i < 4; i++) add(24 + i / 2, i % 2 ? 3 : 0) // outer trill
add(26, 1, 2)
add(27, 0, 3) // finale

export function buildChart(): Note[] {
  return steps
    .flatMap(([beat, lanes]) => lanes.map((lane) => ({ time: (COUNT_IN_BEATS + beat) * BEAT, lane, hit: null })))
    .sort((a, b) => a.time - b.time)
}

export function grade(errorSec: number): Judgement | null {
  const e = Math.abs(errorSec)
  if (e <= WINDOWS.perfect) return 'perfect'
  if (e <= WINDOWS.great) return 'great'
  if (e <= WINDOWS.good) return 'good'
  return null
}
