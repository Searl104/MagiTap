// Layout and rules for Tile Walk. World units: x across, y up, z forward.

export type Vec3 = [number, number, number]

export const ROWS = 10
export const COLS = 4
/**
 * Crumbling tiles in each row (row 1 first). There is no tell, and every fall
 * reshuffles the dungeon, so a hesitant attempt is blind: (1/2)^8 · (1/4)^2 = 1 in 4096.
 * The secret (see CONFIDENCE_WINDOW in engine.ts): hop again quickly and the tile holds.
 */
export const TRAPS_PER_ROW = [2, 2, 2, 2, 2, 2, 2, 2, 3, 3]

export const ROW_GAP = 1.15 // z distance between rows
export const COL_GAP = 1.0 // x distance between tile centres
export const HALF = 0.42 // half a tile's width
export const ORB_Y = 0.32 // the orb hovers this high over a tile
export const EXIT_ROW = ROWS + 1
export const EXIT_Z = EXIT_ROW * ROW_GAP
export const DOOR_Z = EXIT_Z + 1.5

export const tileX = (col: number) => (col - (COLS - 1) / 2) * COL_GAP
export const rowZ = (row: number) => row * ROW_GAP

/** Where the orb rests on `row` (0 = start ledge, EXIT_ROW = exit landing). */
export const restPos = (row: number, col: number | null): Vec3 => [col === null ? 0 : tileX(col), ORB_Y, rowZ(row)]

export type Tile = {
  col: number
  trap: boolean
  /** Crack polylines in tile-local (x, z), only on traps; shown once stepped on. */
  cracks: [number, number][][]
  /** Time the tile started falling, once a trap has been stepped on. */
  fallT: number | null
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeCracks(): [number, number][][] {
  const lim = HALF * 0.92
  const clamp = (v: number) => Math.max(-lim, Math.min(lim, v))
  const ox = (Math.random() - 0.5) * 0.3
  const oz = (Math.random() - 0.5) * 0.3
  const branches = 3 + Math.floor(Math.random() * 2)
  return Array.from({ length: branches }, (_, b) => {
    let angle = (b / branches) * Math.PI * 2 + Math.random() * 0.8
    let x = ox
    let z = oz
    const pts: [number, number][] = [[x, z]]
    for (let i = 0; i < 4; i++) {
      angle += (Math.random() - 0.5) * 1.0
      const len = 0.07 + Math.random() * 0.06
      x = clamp(x + Math.cos(angle) * len)
      z = clamp(z + Math.sin(angle) * len)
      pts.push([x, z])
    }
    return pts
  })
}

/** A fresh dungeon: rows[0] is row 1, nearest the ledge. */
export function buildRows(): Tile[][] {
  return TRAPS_PER_ROW.map((count) => {
    const traps = new Set(shuffle([0, 1, 2, 3]).slice(0, count))
    return Array.from({ length: COLS }, (_, col) => ({
      col,
      trap: traps.has(col),
      cracks: traps.has(col) ? makeCracks() : [],
      fallT: null,
    }))
  })
}
