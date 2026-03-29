export type BoardType = 'friends' | 'global'

interface BoardSelectorProps {
  activeBoard: BoardType
  onBoardChange: (board: BoardType) => void
}

const BOARDS: { id: BoardType; label: string }[] = [
  { id: 'friends', label: 'Friends' },
  { id: 'global', label: 'Global' },
]

export function BoardSelector({ activeBoard, onBoardChange }: BoardSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label="Leaderboard board selector"
      className="flex rounded-full bg-white/10 p-1"
    >
      {BOARDS.map((board) => {
        const isActive = activeBoard === board.id
        return (
          <button
            key={board.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onBoardChange(board.id)}
            className={`min-h-[44px] rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70 ${
              isActive
                ? 'bg-primary/20 text-primary-lt'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {board.label}
          </button>
        )
      })}
    </div>
  )
}
