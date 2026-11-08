import { LANE_COLORS } from './draw'

// Rail i runs from (40 + 5i, 16) at the horizon to (4 + 23i, 82) at the hit line.
const TOP_Y = 16
const HIT_Y = 82
const railX = (i: number, t: number) => 40 + 5 * i + (4 + 23 * i - (40 + 5 * i)) * t
const yAt = (t: number) => TOP_Y + (HIT_Y - TOP_Y) * t

/** A target in `lane` at depth `t` (0 = horizon, 1 = hit line). */
function Target({ lane, t }: { lane: number; t: number }) {
  const x0 = railX(lane, t)
  const x1 = railX(lane + 1, t)
  const inset = (x1 - x0) * 0.1
  const h = 1 + 6 * t * t
  return <rect x={x0 + inset} y={yAt(t) - h} width={x1 - x0 - inset * 2} height={h} rx={h / 4} fill={LANE_COLORS[lane]} />
}

/** Launcher tile art: four rails converging, with targets riding them. */
export default function RailsIcon() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="rails-glow" cx="50%" cy="16%" r="45%">
          <stop offset="0" stopColor="#ffbeff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffbeff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#rails-glow)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const outer = i === 0 || i === 4
        return (
          <line
            key={i}
            x1={railX(i, 0)}
            y1={TOP_Y}
            x2={railX(i, 1)}
            y2={HIT_Y}
            stroke="#ffdcff"
            strokeOpacity={outer ? 0.9 : 0.4}
            strokeWidth={outer ? 2 : 1.2}
          />
        )
      })}
      <line x1="2" y1={HIT_Y} x2="98" y2={HIT_Y} stroke="#fff7d6" strokeWidth="3" strokeLinecap="round" />
      <Target lane={1} t={0.25} />
      <Target lane={2} t={0.5} />
      <Target lane={0} t={0.85} />
    </svg>
  )
}
