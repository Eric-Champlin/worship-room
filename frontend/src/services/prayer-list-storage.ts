import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerVerseContext } from '@/types/daily-experience'
import type { PersonalPrayer } from '@/types/personal-prayer'
import { getLocalDateString } from '@/utils/date'

// ── localStorage key ──────────────────────────────────────────────────
const PRAYER_LIST_KEY = 'wr_prayer_list'
export const MAX_PRAYERS = 200

// ── Helpers ───────────────────────────────────────────────────────────
function readPrayers(): PersonalPrayer[] {
  try {
    const raw = localStorage.getItem(PRAYER_LIST_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PersonalPrayer[]
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return []
  }
}

function writePrayers(prayers: PersonalPrayer[]): void {
  try {
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))
  } catch (_e) {
    // localStorage may be unavailable or quota exceeded
  }
}

// ── CRUD Functions ────────────────────────────────────────────────────

export function getPrayers(): PersonalPrayer[] {
  return readPrayers()
}

export function addPrayer(input: {
  title: string
  description: string
  category: PrayerCategory
  sourceType?: 'prayer_wall'
  sourceId?: string
  verseContext?: PrayerVerseContext
}): PersonalPrayer | null {
  const prayers = readPrayers()
  if (prayers.length >= MAX_PRAYERS) return null

  const now = new Date().toISOString()
  const prayer: PersonalPrayer = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    verseContext: input.verseContext,
  }

  writePrayers([...prayers, prayer])
  return prayer
}

export function updatePrayer(
  id: string,
  updates: Partial<Pick<PersonalPrayer, 'title' | 'description' | 'category'>>,
): void {
  const prayers = readPrayers()
  const updated = prayers.map((p) =>
    p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
  )
  writePrayers(updated)
}

export function deletePrayer(id: string): void {
  const prayers = readPrayers().filter((p) => p.id !== id)
  writePrayers(prayers)
}

export function markAnswered(id: string, answeredNote?: string): void {
  const prayers = readPrayers()
  const now = new Date().toISOString()
  const updated = prayers.map((p) =>
    p.id === id
      ? {
          ...p,
          status: 'answered' as const,
          answeredAt: now,
          answeredNote: answeredNote ?? null,
          updatedAt: now,
        }
      : p,
  )
  writePrayers(updated)
}

export function markPrayed(id: string): void {
  const prayers = readPrayers()
  const now = new Date().toISOString()
  const updated = prayers.map((p) =>
    p.id === id ? { ...p, lastPrayedAt: now, updatedAt: now } : p,
  )
  writePrayers(updated)
}

export function getPrayerCounts(): { all: number; active: number; answered: number } {
  const prayers = readPrayers()
  return {
    all: prayers.length,
    active: prayers.filter((p) => p.status === 'active').length,
    answered: prayers.filter((p) => p.status === 'answered').length,
  }
}

// ── Reminder Functions ───────────────────────────────────────────────

export function updateReminder(id: string, enabled: boolean, time?: string): void {
  const prayers = readPrayers()
  const updated = prayers.map((p) => {
    if (p.id !== id) return p
    const patch: Partial<PersonalPrayer> = {
      reminderEnabled: enabled,
      updatedAt: new Date().toISOString(),
    }
    if (enabled && !p.reminderTime && !time) {
      patch.reminderTime = '09:00'
    }
    if (time !== undefined) {
      patch.reminderTime = time
    }
    return { ...p, ...patch }
  })
  writePrayers(updated)
}

export function getActivePrayersWithReminders(): PersonalPrayer[] {
  return readPrayers().filter(
    (p) => p.status === 'active' && p.reminderEnabled === true,
  )
}

export function getAnsweredThisMonth(): number {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  return readPrayers().filter((p) => {
    if (p.status !== 'answered' || !p.answeredAt) return false
    const answered = new Date(p.answeredAt)
    return answered.getMonth() === currentMonth && answered.getFullYear() === currentYear
  }).length
}

// ── Reminder Toast Tracking ──────────────────────────────────────────

const REMINDERS_SHOWN_KEY = 'wr_prayer_reminders_shown'

interface PrayerReminderShown {
  date: string
  shownPrayerIds: string[]
}

function readRemindersShown(): PrayerReminderShown | null {
  try {
    const raw = localStorage.getItem(REMINDERS_SHOWN_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PrayerReminderShown
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return null
  }
}

export function hasShownRemindersToday(): boolean {
  const data = readRemindersShown()
  if (!data) return false
  return data.date === getLocalDateString()
}

export function markRemindersShown(prayerIds: string[]): void {
  const data: PrayerReminderShown = {
    date: getLocalDateString(),
    shownPrayerIds: prayerIds,
  }
  try {
    localStorage.setItem(REMINDERS_SHOWN_KEY, JSON.stringify(data))
  } catch (_e) {
    // localStorage may be unavailable or quota exceeded
  }
}
