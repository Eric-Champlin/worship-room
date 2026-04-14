/**
 * Pure date utility functions for the Bible reading streak system.
 * All operations use local timezone (user's device).
 */

/** Returns today's date as YYYY-MM-DD in the user's local timezone. */
export function getTodayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns the number of days between two YYYY-MM-DD date strings. */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/** Returns the Monday (ISO week start) of the week containing the given YYYY-MM-DD date. */
export function getISOWeekStart(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // ISO weeks start on Monday. Sunday (0) is treated as day 7.
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Returns the date one day before the given YYYY-MM-DD date. */
export function getYesterday(date: string): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
