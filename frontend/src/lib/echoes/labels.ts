import type { EchoKind } from '@/types/echoes'

/** Meaningful intervals in days where echoes trigger */
export const ECHO_INTERVALS = [7, 14, 30, 60, 90, 180, 365] as const

const INTERVAL_LABELS: Record<number, string> = {
  7: 'a week ago',
  14: 'two weeks ago',
  30: 'a month ago',
  60: 'two months ago',
  90: 'three months ago',
  180: 'six months ago',
  365: 'a year ago',
}

/**
 * Returns the matched meaningful interval if `daysSince` falls within ±1 of any interval,
 * or null if no match.
 */
export function getMatchedInterval(daysSince: number): number | null {
  for (const interval of ECHO_INTERVALS) {
    if (daysSince >= interval - 1 && daysSince <= interval + 1) {
      return interval
    }
  }
  return null
}

/**
 * Returns a human-readable relative label for an echo.
 *
 * For interval-based echoes: "a week ago", "a month ago", etc.
 * For read-on-this-day echoes: "on this day last year" or "on this day in [year]".
 */
export function getRelativeLabel(
  matchedInterval: number,
  kind: EchoKind,
  year?: number,
): string {
  if (kind === 'read-on-this-day' && year !== undefined) {
    const currentYear = new Date().getFullYear()
    if (currentYear - year === 1) {
      return 'on this day last year'
    }
    return `on this day in ${year}`
  }

  return INTERVAL_LABELS[matchedInterval] ?? `${matchedInterval} days ago`
}
