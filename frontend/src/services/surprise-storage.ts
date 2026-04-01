import { getLocalDateString } from '@/utils/date'

// ── localStorage keys ───────────────────────────────────────────────
const LAST_SURPRISE_DATE_KEY = 'wr_last_surprise_date'
const ANNIVERSARY_MILESTONES_KEY = 'wr_anniversary_milestones_shown'
const RAINBOW_SHOWN_KEY = 'wr_surprise_shown_rainbow'
const GRATITUDE_CALLBACK_LAST_KEY = 'wr_gratitude_callback_last_shown'

// ── Midnight Verse sessionStorage key ───────────────────────────────
const MIDNIGHT_SESSION_KEY = 'wr_midnight_verse_shown'

// ── Frequency limiter ───────────────────────────────────────────────
export function canShowSurprise(): boolean {
  try {
    const last = localStorage.getItem(LAST_SURPRISE_DATE_KEY)
    return last !== getLocalDateString()
  } catch (_e) {
    return true
  }
}

export function markSurpriseShown(): void {
  try {
    localStorage.setItem(LAST_SURPRISE_DATE_KEY, getLocalDateString())
  } catch (_e) {
    // quota exceeded — silently fail
  }
}

// ── Anniversary milestones ──────────────────────────────────────────
export function getShownMilestones(): number[] {
  try {
    const raw = localStorage.getItem(ANNIVERSARY_MILESTONES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is number => typeof v === 'number')
  } catch (_e) {
    return []
  }
}

export function markMilestoneShown(days: number): void {
  try {
    const current = getShownMilestones()
    if (!current.includes(days)) {
      current.push(days)
    }
    localStorage.setItem(ANNIVERSARY_MILESTONES_KEY, JSON.stringify(current))
  } catch (_e) {
    // quota exceeded — silently fail
  }
}

// ── Rainbow ─────────────────────────────────────────────────────────
export function hasRainbowBeenShown(): boolean {
  try {
    return localStorage.getItem(RAINBOW_SHOWN_KEY) === 'true'
  } catch (_e) {
    return false
  }
}

export function markRainbowShown(): void {
  try {
    localStorage.setItem(RAINBOW_SHOWN_KEY, 'true')
  } catch (_e) {
    // quota exceeded — silently fail
  }
}

// ── Gratitude callback ──────────────────────────────────────────────
export function canShowGratitudeCallback(): boolean {
  try {
    const last = localStorage.getItem(GRATITUDE_CALLBACK_LAST_KEY)
    if (!last) return true
    const lastDate = new Date(last + 'T12:00:00')
    const today = new Date(getLocalDateString() + 'T12:00:00')
    const diffMs = today.getTime() - lastDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return diffDays >= 7
  } catch (_e) {
    return true
  }
}

export function markGratitudeCallbackShown(): void {
  try {
    localStorage.setItem(GRATITUDE_CALLBACK_LAST_KEY, getLocalDateString())
  } catch (_e) {
    // quota exceeded — silently fail
  }
}

// ── Midnight Verse (sessionStorage) ─────────────────────────────────
export function hasMidnightVerseBeenShown(): boolean {
  try {
    return sessionStorage.getItem(MIDNIGHT_SESSION_KEY) === 'true'
  } catch (_e) {
    return false
  }
}

export function markMidnightVerseShown(): void {
  try {
    sessionStorage.setItem(MIDNIGHT_SESSION_KEY, 'true')
  } catch (_e) {
    // sessionStorage unavailable — silently fail
  }
}

// ── Anniversary stat helpers ────────────────────────────────────────
export function getFirstActivityDate(): string | null {
  try {
    let earliest: string | null = null

    // Check mood entries
    const moodRaw = localStorage.getItem('wr_mood_entries')
    if (moodRaw) {
      const moods = JSON.parse(moodRaw)
      if (Array.isArray(moods)) {
        for (const entry of moods) {
          if (entry.date && (!earliest || entry.date < earliest)) {
            earliest = entry.date
          }
        }
      }
    }

    // Check daily activities
    const activityRaw = localStorage.getItem('wr_daily_activities')
    if (activityRaw) {
      const activities = JSON.parse(activityRaw)
      if (activities && typeof activities === 'object' && !Array.isArray(activities)) {
        for (const date of Object.keys(activities)) {
          if (!earliest || date < earliest) {
            earliest = date
          }
        }
      }
    }

    return earliest
  } catch (_e) {
    return null
  }
}

export function getDaysSinceFirstActivity(): number | null {
  const firstDate = getFirstActivityDate()
  if (!firstDate) return null

  const first = new Date(firstDate + 'T12:00:00')
  const today = new Date(getLocalDateString() + 'T12:00:00')
  const diffMs = today.getTime() - first.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}
