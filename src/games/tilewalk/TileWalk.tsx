import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { GameProps } from '..'
import BackButton from '../../components/BackButton'
import { createTileWalk, type Hud, type Phase, type Result } from './engine'
import { ROWS } from './world'
import './TileWalk.css'

const formatTime = (s: number) =>
  s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`

export default function TileWalk({ onExit }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('intro')
  const [hud, setHud] = useState<Hud>({ row: 0, attempt: 1, best: 0 })
  const [result, setResult] = useState<Result | null>(null)
  const [engine] = useState(() => createTileWalk({ onPhase: setPhase, onHud: setHud, onResult: setResult }))

  useEffect(() => engine.attach(canvasRef.current!), [engine])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    engine.tap(e.clientX - rect.left, e.clientY - rect.top)
  }

  return (
    <div className="tilewalk" onPointerDown={onDown}>
      <canvas ref={canvasRef} className="tw-canvas" />
      <BackButton onClick={onExit} />

      {phase !== 'intro' && (
        <div className="tw-hud">
          <span className="tw-row">
            Row {hud.row}
            <small> / {ROWS}</small>
          </span>
          <span className="tw-meta">
            Attempt {hud.attempt}
            {hud.best > 0 && <> · best {hud.best}</>}
          </span>
        </div>
      )}

      {phase === 'intro' && (
        <div className="tw-panel">
          <h1>Tile Walk</h1>
          <p>Hop across all {ROWS} rows to escape. Half the tiles crumble and nothing tells you which. Every fall shuffles the dungeon.</p>
          <p className="tw-cta">Tap to begin</p>
        </div>
      )}

      {phase === 'won' && result && (
        <div className="tw-panel">
          <h1>Escaped</h1>
          <p>
            {result.attempts === 1 ? 'First try. Unbelievable.' : `After ${result.attempts.toLocaleString()} attempts`} in{' '}
            {formatTime(result.seconds)}.
          </p>
          <p className="tw-cta">Tap to walk again</p>
        </div>
      )}
    </div>
  )
}
