import { useCallback } from 'react'
import type { LeaderboardEntry } from '@/types/dashboard'

const RANK_COLORS: Record<number, string> = {
  1: 'text-medal-gold',
  2: 'text-medal-silver',
  3: 'text-medal-bronze',
}

interface GlobalRowProps {
  rank: number
  entry: LeaderboardEntry
  isCurrentUser: boolean
  onClick: () => void
  index?: number
}

export function GlobalRow({ rank, entry, isCurrentUser, onClick, index = 0 }: GlobalRowProps) {
  const rankColor = RANK_COLORS[rank] || 'text-white/70'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
    [onClick],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/10 ${
        isCurrentUser
          ? 'border-l-2 border-primary bg-primary/[0.08]'
          : index % 2 === 0
            ? 'bg-white/[0.04]'
            : 'bg-white/[0.06]'
      }`}
    >
      {/* Rank */}
      <span className={`min-w-[40px] text-center text-lg font-bold ${rankColor}`}>
        {rank}
      </span>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate font-medium text-white">
        {isCurrentUser ? `${entry.displayName} (You)` : entry.displayName}
      </span>

      {/* Points */}
      <span className="text-sm text-white/70">{entry.weeklyPoints} pts</span>
    </div>
  )
}
