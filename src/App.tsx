import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Judgement } from './game/chart'
import { createEngine, type Hud, type Phase, type Results } from './game/engine'
import './App.css'

const JUDGE_TEXT: Record<Judgement, string> = { perfect: 'Perfect', great: 'Great', good: 'Good', miss: 'Miss' }

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [count, setCount] = useState<string | null>(null)
  const [hud, setHud] = useState<Hud>({ score: 0, combo: 0 })
  const [judge, setJudge] = useState<{ id: number; kind: Judgement } | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [engine] = useState(() =>
    createEngine({ onPhase: setPhase, onCount: setCount, onHud: setHud, onJudge: setJudge, onResults: setResults }),
  )

  useEffect(() => engine.attach(canvasRef.current!), [engine])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    engine.pointerDown(e.pointerId, e.clientX - rect.left)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => engine.pointerUp(e.pointerId)

  const inGame = phase === 'countdown' || phase === 'playing'

  return (
    <div className="stage" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
      <canvas ref={canvasRef} className="rails" />

      {inGame && (
        <div className="hud">
          <span className="score">{hud.score.toLocaleString()}</span>
          {hud.combo > 1 && <span className="combo">{hud.combo} combo</span>}
        </div>
      )}

      {count && (
        <div key={count} className={count === 'GO!' ? 'count go' : 'count'}>
          {count}
        </div>
      )}

      {inGame && judge && (
        <div key={judge.id} className={`judge ${judge.kind}`}>
          {JUDGE_TEXT[judge.kind]}
        </div>
      )}

      {phase === 'ready' && (
        <div className="panel">
          <h1>MagiTap</h1>
          <p>Tap a lane as each target crosses the line.</p>
          <p className="cta">Tap to start</p>
        </div>
      )}

      {phase === 'done' && results && (
        <div className="panel">
          <h1>{results.counts.miss === 0 ? 'Full combo!' : 'Pattern clear'}</h1>
          <p className="big">{results.score.toLocaleString()}</p>
          <ul className="tally">
            {(Object.keys(JUDGE_TEXT) as Judgement[]).map((k) => (
              <li key={k} className={k}>
                <span>{JUDGE_TEXT[k]}</span>
                <span>{results.counts[k]}</span>
              </li>
            ))}
            <li>
              <span>Max combo</span>
              <span>
                {results.maxCombo}/{results.total}
              </span>
            </li>
          </ul>
          <p className="cta">Tap to play again</p>
        </div>
      )}
    </div>
  )
}
