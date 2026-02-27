const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function timeAgo(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return 'just now'
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 0) return 'just now'
  if (seconds < MINUTE) return 'just now'
  if (seconds < HOUR) {
    const mins = Math.floor(seconds / MINUTE)
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  }
  if (seconds < DAY) {
    const hrs = Math.floor(seconds / HOUR)
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`
  }
  if (seconds < WEEK) {
    const days = Math.floor(seconds / DAY)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  if (seconds < MONTH) {
    const weeks = Math.floor(seconds / WEEK)
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  }
  if (seconds < YEAR) {
    const months = Math.floor(seconds / MONTH)
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  }
  const years = Math.floor(seconds / YEAR)
  return `${years} ${years === 1 ? 'year' : 'years'} ago`
}

export function formatFullDate(isoDate: string): string {
  const date = new Date(isoDate)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
