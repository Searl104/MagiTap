import './BackButton.css'

/** Leaves the current game. Stops pointerdown so the game's stage never sees the tap. */
export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back" aria-label="Back to games" onPointerDown={(e) => e.stopPropagation()} onClick={onClick}>
      ‹
    </button>
  )
}
