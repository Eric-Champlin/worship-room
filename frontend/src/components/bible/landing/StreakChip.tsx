import { Flame } from 'lucide-react'
import type { BibleStreak } from '@/types/bible-landing'

interface StreakChipProps {
  streak: BibleStreak | null
  onClick?: () => void
}

export function StreakChip({ streak, onClick }: StreakChipProps) {
  if (!streak || streak.count <= 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.09] min-h-[44px]"
    >
      <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
      <span>{streak.count} day streak</span>
    </button>
  )
}
