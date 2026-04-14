import { CHAPTERS_VISITED_KEY } from '@/constants/bible'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import type { ChapterVisitStore } from '@/types/heatmap'

const MAX_DAYS = 400

// --- Module-level state ---
let cache: ChapterVisitStore | null = null
const listeners = new Set<() => void>()

// --- Storage I/O ---
function readFromStorage(): ChapterVisitStore {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(CHAPTERS_VISITED_KEY)
    if (raw) {
      return JSON.parse(raw) as ChapterVisitStore
    }
    return {}
  } catch {
    return {}
  }
}

function writeToStorage(data: ChapterVisitStore): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CHAPTERS_VISITED_KEY, JSON.stringify(data))
  } catch {
    // Silent failure — localStorage may be unavailable (private browsing, quota exceeded)
  }
}

function getCache(): ChapterVisitStore {
  if (cache === null) {
    cache = readFromStorage()
  }
  return cache
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

// --- Public API ---

/** Records a chapter visit for today. Idempotent: same book+chapter on the same day is stored once. */
export function recordChapterVisit(book: string, chapter: number): void {
  const today = getTodayLocal()
  const data = { ...getCache() }
  const todayEntries = data[today] ?? []

  // Dedup: check if this book+chapter is already recorded today
  const alreadyRecorded = todayEntries.some(
    (entry) => entry.book === book && entry.chapter === chapter,
  )
  if (alreadyRecorded) return

  // Append the visit
  data[today] = [...todayEntries, { book, chapter }]

  // Evict oldest days if over cap
  const dates = Object.keys(data).sort()
  if (dates.length > MAX_DAYS) {
    const toRemove = dates.slice(0, dates.length - MAX_DAYS)
    for (const date of toRemove) {
      delete data[date]
    }
  }

  cache = data
  writeToStorage(data)
  notify()
}

/** Returns a shallow clone of all chapter visits. */
export function getAllVisits(): ChapterVisitStore {
  return { ...getCache() }
}

/** Returns entries within the date range (inclusive). */
export function getVisitsInRange(startDate: string, endDate: string): ChapterVisitStore {
  const data = getCache()
  const result: ChapterVisitStore = {}

  for (const [date, entries] of Object.entries(data)) {
    if (date >= startDate && date <= endDate) {
      result[date] = entries
    }
  }

  return result
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clears in-memory cache for test isolation. */
export function _resetForTesting(): void {
  cache = null
  listeners.clear()
}
