import { getMockReactions } from '@/mocks/prayer-wall-mock-data'
import type { PrayerReaction } from '@/types/prayer-wall'

const STORAGE_KEY = 'wr_prayer_reactions'

let cache: Record<string, PrayerReaction> | null = null
let snapshotCache: Record<string, PrayerReaction> | null = null
const listeners = new Set<() => void>()

function isValidReaction(value: unknown): value is PrayerReaction {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.prayerId === 'string' &&
    typeof r.isPraying === 'boolean' &&
    typeof r.isBookmarked === 'boolean'
  )
}

function readFromStorage(): Record<string, PrayerReaction> | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }
    const result: Record<string, PrayerReaction> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!isValidReaction(value)) return null
      result[key] = value
    }
    return result
  } catch {
    return null
  }
}

function writeToStorage(data: Record<string, PrayerReaction>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Silent failure — localStorage may be unavailable (private browsing, quota exceeded)
  }
}

function seedFromMock(): Record<string, PrayerReaction> {
  const seed = getMockReactions()
  writeToStorage(seed)
  return seed
}

function getCache(): Record<string, PrayerReaction> {
  if (cache === null) {
    const stored = readFromStorage()
    cache = stored !== null ? stored : seedFromMock()
  }
  return cache
}

function invalidateSnapshot(): void {
  snapshotCache = null
}

function notify(): void {
  invalidateSnapshot()
  for (const listener of listeners) {
    listener()
  }
}

// --- Public API ---

/** Returns the current reactions record. Referentially stable between mutations (required for useSyncExternalStore). */
export function getSnapshot(): Record<string, PrayerReaction> {
  if (snapshotCache === null) {
    snapshotCache = getCache()
  }
  return snapshotCache
}

/** Alias for getSnapshot — kept for API parity with the spec name. */
export function getReactions(): Record<string, PrayerReaction> {
  return getSnapshot()
}

/** Returns the reaction for a single prayer, or undefined if no record exists. */
export function getReaction(prayerId: string): PrayerReaction | undefined {
  return getCache()[prayerId]
}

/** Toggles isPraying for prayerId. Returns the PREVIOUS isPraying value (true = was praying before the toggle). */
export function togglePraying(prayerId: string): boolean {
  const current = getCache()[prayerId]
  const wasPraying = current?.isPraying ?? false
  const next: PrayerReaction = {
    prayerId,
    isPraying: !wasPraying,
    isBookmarked: current?.isBookmarked ?? false,
  }
  cache = { ...getCache(), [prayerId]: next }
  writeToStorage(cache)
  notify()
  return wasPraying
}

/** Toggles isBookmarked for prayerId. */
export function toggleBookmark(prayerId: string): void {
  const current = getCache()[prayerId]
  const next: PrayerReaction = {
    prayerId,
    isPraying: current?.isPraying ?? false,
    isBookmarked: !(current?.isBookmarked ?? false),
  }
  cache = { ...getCache(), [prayerId]: next }
  writeToStorage(cache)
  notify()
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clears in-memory cache and listeners for test isolation. Does NOT touch localStorage. */
export function _resetForTesting(): void {
  cache = null
  snapshotCache = null
  listeners.clear()
}
