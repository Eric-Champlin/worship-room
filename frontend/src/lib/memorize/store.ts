import { MEMORIZATION_CARDS_KEY } from '@/constants/bible'
import type { MemorizationCard } from '@/types/memorize'

// --- Module-level state ---
let cache: MemorizationCard[] | null = null
let snapshotCache: MemorizationCard[] | null = null
const listeners = new Set<() => void>()

// --- ID generation ---
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Storage I/O ---
function readFromStorage(): MemorizationCard[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(MEMORIZATION_CARDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidCard)
  } catch {
    return []
  }
}

function writeToStorage(data: MemorizationCard[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(MEMORIZATION_CARDS_KEY, JSON.stringify(data))
  } catch {
    // Silent failure — localStorage may be unavailable (private browsing, quota exceeded)
  }
}

function getCache(): MemorizationCard[] {
  if (cache === null) {
    cache = readFromStorage()
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

function isValidCard(card: unknown): card is MemorizationCard {
  if (typeof card !== 'object' || card === null) return false
  const c = card as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.book === 'string' &&
    typeof c.bookName === 'string' &&
    typeof c.chapter === 'number' &&
    typeof c.startVerse === 'number' &&
    typeof c.endVerse === 'number' &&
    typeof c.verseText === 'string' &&
    typeof c.reference === 'string' &&
    typeof c.createdAt === 'number' &&
    typeof c.reviewCount === 'number'
  )
}

// --- Public API ---

/** Returns all cards sorted by createdAt descending (newest first). Referentially stable between mutations. */
export function getAllCards(): MemorizationCard[] {
  if (snapshotCache === null) {
    snapshotCache = [...getCache()].sort((a, b) => b.createdAt - a.createdAt)
  }
  return snapshotCache
}

/** Adds a card to the deck. Deduplicates: returns existing card if verse range already in deck. */
export function addCard(params: {
  book: string
  bookName: string
  chapter: number
  startVerse: number
  endVerse: number
  verseText: string
  reference: string
}): MemorizationCard {
  const existing = getCardForVerse(
    params.book,
    params.chapter,
    params.startVerse,
    params.endVerse,
  )
  if (existing) return existing

  const card: MemorizationCard = {
    id: generateId(),
    ...params,
    createdAt: Date.now(),
    lastReviewedAt: null,
    reviewCount: 0,
  }

  cache = [...getCache(), card]
  writeToStorage(cache)
  notify()
  return card
}

/** Removes a card by ID. No-ops for unknown IDs. */
export function removeCard(id: string): void {
  const data = getCache()
  const filtered = data.filter((c) => c.id !== id)
  if (filtered.length === data.length) return // not found
  cache = filtered
  writeToStorage(cache)
  notify()
}

/** Records a review: increments reviewCount and updates lastReviewedAt. */
export function recordReview(id: string): void {
  const data = getCache()
  const idx = data.findIndex((c) => c.id === id)
  if (idx === -1) return

  const updated = [...data]
  updated[idx] = {
    ...updated[idx],
    reviewCount: updated[idx].reviewCount + 1,
    lastReviewedAt: Date.now(),
  }
  cache = updated
  writeToStorage(cache)
  notify()
}

/** Checks if a verse range is already in the deck. */
export function isCardForVerse(
  book: string,
  chapter: number,
  startVerse: number,
  endVerse?: number,
): boolean {
  return getCardForVerse(book, chapter, startVerse, endVerse) !== undefined
}

/** Returns the card matching the verse range, or undefined. */
export function getCardForVerse(
  book: string,
  chapter: number,
  startVerse: number,
  endVerse?: number,
): MemorizationCard | undefined {
  const ev = endVerse ?? startVerse
  return getCache().find(
    (c) =>
      c.book === book &&
      c.chapter === chapter &&
      c.startVerse === startVerse &&
      c.endVerse === ev,
  )
}

/** Subscribe to store changes. Returns an unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clears in-memory cache and listeners for test isolation. */
export function _resetForTesting(): void {
  cache = null
  snapshotCache = null
  listeners.clear()
}
