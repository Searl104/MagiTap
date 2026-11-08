import type { GameEntry } from './games'
import './Launcher.css'

export default function Launcher({ games, onOpen }: { games: GameEntry[]; onOpen: (id: string) => void }) {
  return (
    <div className="launcher">
      <header>
        <h1>MagiTap</h1>
        <p>Pick a game</p>
      </header>
      <ul className="tiles">
        {games.map(({ id, title, blurb, tint, Icon }) => (
          <li key={id}>
            <button className="tile" onClick={() => onOpen(id)}>
              <span className="art" style={{ background: tint }}>
                <Icon />
              </span>
              <span className="title">{title}</span>
              <span className="blurb">{blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
