import { useState, type CSSProperties, type PointerEvent } from 'react'
import './App.css'

type Spark = { id: number; x: number; y: number; dx: number; dy: number }

const SPARKS_PER_TAP = 10
const SPARK_LIFETIME_MS = 700
let nextId = 0

// Placeholder toy: every touch (multi-touch too) throws a burst of sparks.
export default function App() {
  const [sparks, setSparks] = useState<Spark[]>([])
  const [tapped, setTapped] = useState(false)

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    setTapped(true)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const burst = Array.from({ length: SPARKS_PER_TAP }, (_, i) => {
      const angle = (i / SPARKS_PER_TAP) * Math.PI * 2 + Math.random() * 0.5
      const dist = 50 + Math.random() * 60
      return { id: nextId++, x, y, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist }
    })
    const ids = new Set(burst.map((s) => s.id))

    setSparks((prev) => [...prev, ...burst])
    setTimeout(() => setSparks((prev) => prev.filter((s) => !ids.has(s.id))), SPARK_LIFETIME_MS)
  }

  return (
    <div className="stage" onPointerDown={handlePointerDown}>
      {sparks.map((s) => (
        <span
          key={s.id}
          className="spark"
          style={{ left: s.x, top: s.y, '--dx': `${s.dx}px`, '--dy': `${s.dy}px` } as CSSProperties}
        />
      ))}
      <p className={tapped ? 'hint hidden' : 'hint'}>Tap anywhere</p>
    </div>
  )
}
