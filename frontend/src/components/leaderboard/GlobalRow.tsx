import { useCallback } from 'react'
import type { LeaderboardEntry } from '@/types/dashboard'

const RANK_COLORS: Record<number, string> = {
  1: 'text-[#FFD700]',
  2: 'text-[#C0C0C0]',
  3: 'text-[#CD7F32]',
}

interface GlobalRowProps {
  rank: number
  entry: LeaderboardEntry
  isCurrentUser: boolean
  onClick: () => void
}

export function GlobalRow({ rank, entry, isCurrentUser, onClick }: GlobalRowProps) {
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
      className={`relative flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5 ${
        isCurrentUser ? 'rounded-lg border-l-2 border-primary bg-primary/10' : ''
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
