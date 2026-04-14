import { useEffect, useRef } from 'react'
import { Flame } from 'lucide-react'
import type { StreakRecord } from '@/types/bible-streak'

interface StreakChipProps {
  streak: StreakRecord
  atRisk: boolean
  pendingMilestone: number | null
  onMilestoneDismissed: () => void
  onClick: () => void
}

export function StreakChip({ streak, atRisk, pendingMilestone, onMilestoneDismissed, onClick }: StreakChipProps) {
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pendingMilestone != null) {
      dismissTimer.current = setTimeout(() => {
        onMilestoneDismissed()
      }, 4000)
      return () => {
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
      }
    }
  }, [pendingMilestone, onMilestoneDismissed])

  if (streak.currentStreak <= 0) return null

  const glowClass = streak.currentStreak > 7
    ? 'shadow-[0_0_20px_rgba(139,92,246,0.30)]'
    : 'shadow-[0_0_12px_rgba(139,92,246,0.15)]'

  const flameColor = atRisk ? 'text-warning' : 'text-orange-400'

  const milestoneClass = pendingMilestone != null
    ? 'animate-pulse motion-reduce:animate-none'
    : ''

  return (
    <button
      type="button"
      onClick={onClick}
      title={atRisk ? 'Read today to keep your streak' : undefined}
      aria-label={`Reading streak: ${streak.currentStreak} days. Tap for details.`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] px-3 py-1.5 text-sm font-semibold text-white transition-all motion-reduce:transition-none duration-base hover:bg-white/[0.09] min-h-[44px] ${glowClass} ${milestoneClass}`}
    >
      <Flame className={`h-4 w-4 ${flameColor}`} aria-hidden="true" />
      <span>{streak.currentStreak} day streak</span>
    </button>
  )
}
