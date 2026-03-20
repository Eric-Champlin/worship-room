import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PersonalPrayer } from '@/types/personal-prayer'

// ── localStorage key ──────────────────────────────────────────────────
const PRAYER_LIST_KEY = 'wr_prayer_list'
export const MAX_PRAYERS = 200

// ── Helpers ───────────────────────────────────────────────────────────
function readPrayers(): PersonalPrayer[] {
  try {
    const raw = localStorage.getItem(PRAYER_LIST_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PersonalPrayer[]
  } catch {
    return []
  }
}

function writePrayers(prayers: PersonalPrayer[]): void {
  try {
    localStorage.setItem(PRAYER_LIST_KEY, JSON.stringify(prayers))
  } catch {
    // Silently fail on quota exceeded — caller can check return values
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
