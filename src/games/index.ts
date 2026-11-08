import type { ComponentType } from 'react'
import RailsGame from './rails/RailsGame'
import RailsIcon from './rails/RailsIcon'
import TileWalk from './tilewalk/TileWalk'
import TileWalkIcon from './tilewalk/TileWalkIcon'

export type GameProps = { onExit: () => void }

export type GameEntry = {
  id: string
  title: string
  blurb: string
  /** Tile background behind the icon art. */
  tint: string
  Icon: ComponentType
  Game: ComponentType<GameProps>
}

/** Everything the launcher shows, in order. Add new games here. */
export const GAMES: GameEntry[] = [
  {
    id: 'rails',
    title: 'Rhythm Rails',
    blurb: 'Tap the beat',
    tint: 'linear-gradient(160deg, #6a2fc4, #1b0942)',
    Icon: RailsIcon,
    Game: RailsGame,
  },
  {
    id: 'tilewalk',
    title: 'Tile Walk',
    blurb: 'Find the safe path',
    tint: 'linear-gradient(170deg, #2a1d45, #080512)',
    Icon: TileWalkIcon,
    Game: TileWalk,
  },
]
