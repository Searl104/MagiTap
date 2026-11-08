import { useState } from 'react'
import Launcher from './Launcher'
import { GAMES } from './games'

// Opens on the launcher; picking a tile swaps the whole screen to that game.
export default function App() {
  const [openId, setOpenId] = useState<string | null>(null)
  const game = GAMES.find((g) => g.id === openId)

  if (game) return <game.Game key={game.id} onExit={() => setOpenId(null)} />
  return <Launcher games={GAMES} onOpen={setOpenId} />
}
