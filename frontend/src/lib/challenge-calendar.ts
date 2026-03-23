import { CHALLENGES } from '@/data/challenges'
import type { Challenge } from '@/types/challenges'

// ---------------------------------------------------------------------------
// Calendar status types & helpers
// ---------------------------------------------------------------------------

export type ChallengeCalendarStatus = 'active' | 'upcoming' | 'past'

export interface ChallengeCalendarInfo {
  status: ChallengeCalendarStatus
  startDate: Date
  endDate: Date
  daysRemaining?: number
  calendarDay?: number
}

/**
 * Compute the end date of a challenge given its start date and duration.
 */
function challengeEndDate(startDate: Date, durationDays: number): Date {
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + durationDays - 1,
  )
}

/**
 * Compare two dates ignoring time — returns < 0 if a < b, 0 if equal, > 0 if a > b.
 */
export function compareDatesOnly(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return utcA - utcB
}

/**
 * Number of days from `from` to `to` (inclusive of from, exclusive of to).
 */
function daysBetween(from: Date, to: Date): number {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((utcTo - utcFrom) / (1000 * 60 * 60 * 24))
}

/**
 * For a given challenge, determine the most relevant calendar occurrence
 * (current year, previous year, or next year) and its status.
 */
export function getChallengeCalendarInfo(
  challenge: Challenge,
  today: Date = new Date(),
): ChallengeCalendarInfo {
  const currentYear = today.getFullYear()
  const yearsToCheck = [currentYear, currentYear + 1, currentYear - 1]

  // Build candidate occurrences
  const occurrences: Array<{
    startDate: Date
    endDate: Date
    status: ChallengeCalendarStatus
    daysRemaining?: number
    calendarDay?: number
  }> = []

  for (const year of yearsToCheck) {
    const startDate = challenge.getStartDate(year)
    const endDate = challengeEndDate(startDate, challenge.durationDays)

    if (compareDatesOnly(today, startDate) >= 0 && compareDatesOnly(today, endDate) <= 0) {
      // Active: today is within [startDate, endDate]
      const remaining = daysBetween(today, endDate)
      const calendarDay = daysBetween(startDate, today) + 1
      occurrences.push({
        startDate,
        endDate,
        status: 'active',
        daysRemaining: remaining,
        calendarDay,
      })
    } else if (compareDatesOnly(today, startDate) < 0) {
      // Upcoming: start date is in the future
      occurrences.push({ startDate, endDate, status: 'upcoming' })
    } else {
      // Past: end date is in the past
      occurrences.push({ startDate, endDate, status: 'past' })
    }
  }

  // Priority: active first, then closest upcoming, then most recent past
  const active = occurrences.find((o) => o.status === 'active')
  if (active) return active

  const upcoming = occurrences
    .filter((o) => o.status === 'upcoming')
    .sort((a, b) => compareDatesOnly(a.startDate, b.startDate))
  if (upcoming.length > 0) {
    return upcoming[0]
  }

  const past = occurrences
    .filter((o) => o.status === 'past')
    .sort((a, b) => compareDatesOnly(b.endDate, a.endDate)) // most recent first
  if (past.length > 0) return past[0]

  // Fallback (should not happen)
  const fallbackStart = challenge.getStartDate(currentYear)
  return {
    status: 'past',
    startDate: fallbackStart,
    endDate: challengeEndDate(fallbackStart, challenge.durationDays),
  }
}

/**
 * Returns info about the currently active challenge, if any.
 * Used by Navbar for the active-challenge indicator dot.
 */
export function getActiveChallengeInfo(
  today: Date = new Date(),
): { challengeId: string; daysRemaining: number; calendarDay: number } | null {
  for (const challenge of CHALLENGES) {
    const info = getChallengeCalendarInfo(challenge, today)
    if (info.status === 'active' && info.daysRemaining != null && info.calendarDay != null) {
      return {
        challengeId: challenge.id,
        daysRemaining: info.daysRemaining,
        calendarDay: info.calendarDay,
      }
    }
  }
  return null
}

export function getNextChallengeInfo(
  today: Date = new Date(),
): { challengeId: string; startDate: Date } | null {
  let nearest: { challengeId: string; startDate: Date } | null = null
  for (const challenge of CHALLENGES) {
    const info = getChallengeCalendarInfo(challenge, today)
    if (info.status === 'upcoming') {
      if (!nearest || info.startDate < nearest.startDate) {
        nearest = { challengeId: challenge.id, startDate: info.startDate }
      }
    }
  }
  return nearest
}
