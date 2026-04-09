import { useCallback } from 'react'
import { Flame, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { MiniGrid } from './MiniGrid'
import type { StreakRecord } from '@/types/bible-streak'

interface StreakDetailModalProps {
  isOpen: boolean
  onClose: () => void
  streak: StreakRecord
  atRisk: boolean
}

function getNextMonday(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun .. 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const target = new Date(now)
  target.setDate(target.getDate() + daysUntilMonday)
  return days[target.getDay()]
}

function getSubtitle(streak: StreakRecord, atRisk: boolean): string {
  const today = getTodayLocal()

  if (streak.lastGraceUsedDate === today) {
    return "You used your grace day. Your streak is safe."
  }
  if (atRisk) {
    return 'Read today to keep your streak alive.'
  }
  if (streak.currentStreak <= 1 && streak.longestStreak > 1) {
    return "Fresh start. You've got this."
  }
  return `You've read ${streak.currentStreak} days in a row.`
}

export function StreakDetailModal({ isOpen, onClose, streak, atRisk }: StreakDetailModalProps) {
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const panelRef = useFocusTrap(isOpen, handleClose)

  if (!isOpen) return null

  const graceUsed = streak.graceDaysUsedThisWeek > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden border border-white/[0.12] pt-12 sm:mx-4 sm:max-w-[480px] sm:rounded-2xl sm:pt-0"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Reading streak details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold text-white">Reading streak</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close streak details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6">
          {/* Big streak number */}
          <div className="mb-2 flex items-center gap-3">
            <span className="text-5xl font-bold" style={GRADIENT_TEXT_STYLE}>
              {streak.currentStreak}
            </span>
            <Flame className="h-8 w-8 text-orange-400" aria-hidden="true" />
          </div>

          {/* Dynamic subtitle */}
          <p className="mb-6 text-base text-white/80">{getSubtitle(streak, atRisk)}</p>

          {/* Stats row */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-white">{streak.currentStreak}</span>
              <span className="text-sm text-white/60">Current streak</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold text-white/80">{streak.longestStreak}</span>
              <span className="text-sm text-white/60">Longest ever</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold text-white/80">{streak.totalDaysRead}</span>
              <span className="text-sm text-white/60">Total days read</span>
            </div>
          </div>

          {/* Grace day status */}
          <div className="mb-6 space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${graceUsed ? 'bg-white/30' : 'bg-success'}`}
              />
              <span className="text-sm text-white/80">
                {graceUsed
                  ? `Grace day used (resets ${getNextMonday()})`
                  : 'Grace day available'}
              </span>
            </div>
            <p className="text-sm text-white/40">
              Miss one day a week without losing your streak.
            </p>
          </div>

          {/* 7-day mini-grid */}
          <div className="mb-6">
            <MiniGrid streak={streak} />
          </div>

          {/* Footer caption */}
          <p className="text-center text-xs text-white/40">
            Streaks help, but they aren&apos;t the point. Read because it matters, not because of the count.
          </p>
        </div>
      </div>
    </div>
  )
}
