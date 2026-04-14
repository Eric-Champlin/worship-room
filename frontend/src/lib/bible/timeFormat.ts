/**
 * Bible-reader-specific relative time formatting.
 *
 * Thresholds are designed for a reading-resume context (e.g. "Earlier today",
 * "This morning") rather than generic social-media style ("5 minutes ago").
 */

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isYesterday(timestamp: Date, now: Date): boolean {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameCalendarDay(timestamp, yesterday)
}

export function formatRelativeReadTime(timestamp: number, now?: number): string {
  const nowMs = now ?? Date.now()
  const diff = nowMs - timestamp
  const hours = diff / 3_600_000
  const days = diff / 86_400_000

  // < 1 hour
  if (diff < 3_600_000) return 'Just now'

  // 1-6 hours
  if (hours < 6) return `${Math.floor(hours)} hours ago`

  const tsDate = new Date(timestamp)
  const nowDate = new Date(nowMs)

  // Same calendar day
  if (isSameCalendarDay(tsDate, nowDate)) {
    return hours < 18 ? 'Earlier today' : 'This morning'
  }

  // Yesterday
  if (isYesterday(tsDate, nowDate)) return 'Yesterday'

  // 2-6 days
  if (days < 7) return `${Math.floor(days)} days ago`

  // 1 week (7-13 days)
  if (days < 14) return '1 week ago'

  // 2-3 weeks (14-27 days)
  if (days < 28) return `${Math.floor(days / 7)} weeks ago`

  // 1 month (28-59 days)
  if (days < 60) return '1 month ago'

  // 2-11 months (60-364 days)
  if (days < 365) return `${Math.floor(days / 30)} months ago`

  // 365+ days
  return 'Over a year ago'
}
