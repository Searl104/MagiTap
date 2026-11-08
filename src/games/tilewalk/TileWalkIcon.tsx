// Launcher tile art: rows of stone tiles receding toward a lit doorway,
// one already fallen away, and the orb waiting on the near row.

const project = (x: number, z: number): [number, number] => {
  const s = 1 / (1 + 0.55 * z)
  return [50 + x * 21 * s, 22 + 72 * s]
}

const quad = (x0: number, x1: number, z0: number, z1: number) =>
  [project(x0, z0), project(x1, z0), project(x1, z1), project(x0, z1)].map((p) => p.join(',')).join(' ')

export default function TileWalkIcon() {
  const tiles: { col: number; row: number }[] = []
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) if (!(row === 1 && col === 2)) tiles.push({ col, row })
  const [ox, oy] = project(-0.5, 0.45)
  const [doorX, doorY] = project(0, 7)

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="tw-door" cx={doorX / 100} cy={doorY / 100} r="0.4">
          <stop offset="0" stopColor="#96cdff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#96cdff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tw-orb" cx={ox / 100} cy={oy / 100} r="0.45">
          <stop offset="0" stopColor="#ffc480" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffc480" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#tw-door)" />
      <rect x={doorX - 3} y={doorY - 9} width="6" height="9" rx="3" fill="#eef7ff" />
      {tiles
        .sort((a, b) => b.row - a.row)
        .map(({ col, row }) => {
          const x = col - 2
          const z = row * 1.25
          const lit = Math.max(0.18, 1 - row * 0.22)
          return (
            <polygon
              key={`${row}-${col}`}
              points={quad(x + 0.08, x + 0.92, z, z + 0.85)}
              fill={`rgb(${150 * lit + 20}, ${135 * lit + 14}, ${160 * lit + 30})`}
            />
          )
        })}
      <rect width="100" height="100" fill="url(#tw-orb)" />
      <circle cx={ox} cy={oy - 5} r="4" fill="#fff4dc" />
    </svg>
  )
}
