import { getTodayLocal, getYesterday } from '@/lib/bible/dateUtils'
import type { StreakRecord } from '@/types/bible-streak'

interface MiniGridProps {
  streak: StreakRecord
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() // 0=Sun .. 6=Sat
  // Map to M T W T F S S
  return DAY_LABELS[day === 0 ? 6 : day - 1]
}

/**
 * Determine if a given date was a "read" day within the current streak window.
 * We infer from the streak metadata since we don't store per-day history.
 */
function wasReadDay(date: string, streak: StreakRecord): boolean {
  if (!streak.lastReadDate || streak.currentStreak <= 0) return false

  // Walk backward from lastReadDate for currentStreak days
  // Account for one grace gap if lastGraceUsedDate is within the window
  let cursor = streak.lastReadDate
  let remaining = streak.currentStreak

  // Build the set of "read" dates
  const readDates = new Set<string>()

  while (remaining > 0) {
    readDates.add(cursor)
    remaining--
    if (remaining > 0) {
      cursor = getYesterday(cursor)
      // If this cursor date is the grace date, skip it (gap day, not a read day)
      if (streak.lastGraceUsedDate && cursor === getYesterday(streak.lastGraceUsedDate)) {
        // The day before grace was used was skipped — jump over it
        cursor = getYesterday(cursor)
      }
    }
  }

  return readDates.has(date)
}

function isGraceDay(date: string, streak: StreakRecord): boolean {
  if (!streak.lastGraceUsedDate) return false
  // The grace day covers the skipped day (the day before lastGraceUsedDate)
  return date === getYesterday(streak.lastGraceUsedDate)
}

export function MiniGrid({ streak }: MiniGridProps) {
  // Build array of last 7 days, oldest to newest (left to right)
  const today = getTodayLocal()
  const days: string[] = []
  let cursor = today
  for (let i = 0; i < 7; i++) {
    days.unshift(cursor)
    if (i < 6) cursor = getYesterday(cursor)
  }

  return (
    <div className="flex items-center justify-center gap-2" role="img" aria-label="Last 7 days reading activity">
      {days.map((date) => {
        const read = wasReadDay(date, streak)
        const grace = isGraceDay(date, streak)

        let squareClass = 'rounded-lg w-8 h-8 sm:w-10 sm:h-10 '
        if (read) {
          squareClass += 'bg-primary'
        } else if (grace) {
          squareClass += 'bg-primary ring-2 ring-warning'
        } else {
          squareClass += 'border border-white/20'
        }

        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <div className={squareClass} />
            <span className="text-xs text-white/40">{getDayLabel(date)}</span>
          </div>
        )
      })}
    </div>
  )
}
