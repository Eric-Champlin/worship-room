/**
 * Spec 6.5 D-TimestampFormat — relative time strings per fixed buckets.
 *
 * Brief locks the exact format and rationale: relative timestamps provide
 * natural privacy protection. Absolute timestamps combined with knowledge of
 * a victim's online patterns enable deanonymization (W-TimingDeanon).
 *
 * Buckets:
 *   < 1 minute       → "just now"
 *   < 60 minutes     → "N min ago"
 *   < 24 hours       → "N hour(s) ago"
 *   < 8 days         → "N day(s) ago"
 *   < 31 days        → "N week(s) ago"
 *   31+ days         → "in <Month> <Year>"
 */
export function relativeTime(reactedAt: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - reactedAt.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 8) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`

  if (diffDay < 31) {
    const weeks = Math.floor(diffDay / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `in ${months[reactedAt.getMonth()]} ${reactedAt.getFullYear()}`
}
