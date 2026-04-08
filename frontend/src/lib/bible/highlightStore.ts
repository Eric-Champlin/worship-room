import { BIBLE_HIGHLIGHTS_KEY } from '@/constants/bible'
import type { Highlight, HighlightColor } from '@/types/bible'

// --- Module-level state ---
let cache: Highlight[] | null = null
const listeners = new Set<() => void>()

// --- Error class ---
export class HighlightStorageFullError extends Error {
  constructor() {
    super('Storage full — export your highlights and clear old ones.')
    this.name = 'HighlightStorageFullError'
  }
}

// --- ID generation ---
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Migration ---
const OLD_COLOR_MAP: Record<string, HighlightColor> = {
  '#FBBF24': 'joy',
  '#34D399': 'promise',
  '#60A5FA': 'peace',
  '#F472B6': 'struggle',
}

function isValidNewFormat(record: unknown): record is Highlight {
  if (typeof record !== 'object' || record === null) return false
  const r = record as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.book === 'string' &&
    typeof r.chapter === 'number' &&
    typeof r.startVerse === 'number' &&
    typeof r.endVerse === 'number' &&
    typeof r.color === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number'
  )
}

function isValidOldFormat(
  record: unknown,
): record is { book: string; chapter: number; verseNumber: number; color: string; createdAt: string } {
  if (typeof record !== 'object' || record === null) return false
  const r = record as Record<string, unknown>
  return (
    typeof r.book === 'string' &&
    typeof r.chapter === 'number' &&
    typeof r.verseNumber === 'number' &&
    typeof r.color === 'string' &&
    typeof r.createdAt === 'string'
  )
}

function migrateOldFormat(raw: unknown): Highlight[] {
  if (!Array.isArray(raw)) return []

  const migrated: Highlight[] = []
  for (const record of raw) {
    if (isValidNewFormat(record)) {
      migrated.push(record)
    } else if (isValidOldFormat(record)) {
      const createdMs = new Date(record.createdAt).getTime() || Date.now()
      migrated.push({
        id: generateId(),
        book: record.book,
        chapter: record.chapter,
        startVerse: record.verseNumber,
        endVerse: record.verseNumber,
        color: OLD_COLOR_MAP[record.color] ?? 'joy',
        createdAt: createdMs,
        updatedAt: createdMs,
      })
    }
    // Invalid records are silently filtered out
  }
  return migrated
}

// --- Storage I/O ---
function readFromStorage(): Highlight[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const highlights = migrateOldFormat(parsed)

    // Write migrated data back if migration happened
    if (highlights.length > 0) {
      const rawParsed = JSON.parse(raw)
      const needsMigration =
        Array.isArray(rawParsed) && rawParsed.some((r: unknown) => isValidOldFormat(r) && !isValidNewFormat(r))
      if (needsMigration) {
        writeToStorage(highlights)
      }
    }

    return highlights
  } catch {
    return []
  }
}

function writeToStorage(data: Highlight[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(data))
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      throw new HighlightStorageFullError()
    }
    // Other errors: silent fail (localStorage unavailable)
  }
}

function getCache(): Highlight[] {
  if (cache === null) {
    cache = readFromStorage()
  }
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

// --- Read API ---
export function getAllHighlights(): Highlight[] {
  return [...getCache()]
}

export function getHighlightsForChapter(book: string, chapter: number): Highlight[] {
  return getCache().filter((hl) => hl.book === book && hl.chapter === chapter)
}

export function getHighlightForVerse(book: string, chapter: number, verse: number): Highlight | null {
  return getCache().find((hl) => hl.book === book && hl.chapter === chapter && verse >= hl.startVerse && verse <= hl.endVerse) ?? null
}

// --- Write API ---
interface HighlightSelection {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
}

function rangesOverlap(a: { startVerse: number; endVerse: number }, b: { startVerse: number; endVerse: number }): boolean {
  return a.startVerse <= b.endVerse && a.endVerse >= b.startVerse
}

export function applyHighlight(selection: HighlightSelection, color: HighlightColor): Highlight {
  const highlights = getCache()
  const now = Date.now()

  // Find overlapping highlights in the same book + chapter
  const overlapping: Highlight[] = []
  const nonOverlapping: Highlight[] = []

  for (const hl of highlights) {
    if (hl.book === selection.book && hl.chapter === selection.chapter && rangesOverlap(hl, selection)) {
      overlapping.push(hl)
    } else {
      nonOverlapping.push(hl)
    }
  }

  // Check for exact same range overwrite
  if (overlapping.length === 1) {
    const existing = overlapping[0]
    if (existing.startVerse === selection.startVerse && existing.endVerse === selection.endVerse) {
      if (existing.color === color) {
        // Idempotent — no change needed
        return existing
      }
      // Same range, different color → update in place
      existing.color = color
      existing.updatedAt = now
      cache = [...nonOverlapping, existing]
      writeToStorage(cache)
      notifyListeners()
      return existing
    }
  }

  // Process overlapping highlights: split/trim/delete
  const remainders: Highlight[] = []

  for (const existing of overlapping) {
    // Case: existing entirely within new range → delete (don't add to remainders)
    if (existing.startVerse >= selection.startVerse && existing.endVerse <= selection.endVerse) {
      continue
    }

    // Case: existing entirely contains new range → split into up to 2 pieces
    if (existing.startVerse < selection.startVerse && existing.endVerse > selection.endVerse) {
      // Left remainder
      remainders.push({
        ...existing,
        id: generateId(),
        endVerse: selection.startVerse - 1,
        updatedAt: now,
      })
      // Right remainder
      remainders.push({
        ...existing,
        id: generateId(),
        startVerse: selection.endVerse + 1,
        updatedAt: now,
      })
      continue
    }

    // Case: existing overlaps left (existing starts before new range)
    if (existing.startVerse < selection.startVerse) {
      remainders.push({
        ...existing,
        id: existing.id,
        endVerse: selection.startVerse - 1,
        updatedAt: now,
      })
      continue
    }

    // Case: existing overlaps right (existing ends after new range)
    if (existing.endVerse > selection.endVerse) {
      remainders.push({
        ...existing,
        id: existing.id,
        startVerse: selection.endVerse + 1,
        updatedAt: now,
      })
      continue
    }
  }

  // Create the new highlight
  const newHighlight: Highlight = {
    id: generateId(),
    book: selection.book,
    chapter: selection.chapter,
    startVerse: selection.startVerse,
    endVerse: selection.endVerse,
    color,
    createdAt: now,
    updatedAt: now,
  }

  cache = [...nonOverlapping, ...remainders, newHighlight]
  writeToStorage(cache)
  notifyListeners()
  return newHighlight
}

export function removeHighlight(id: string): void {
  const highlights = getCache()
  const filtered = highlights.filter((hl) => hl.id !== id)
  if (filtered.length === highlights.length) return // No-op

  cache = filtered
  writeToStorage(cache)
  notifyListeners()
}

export function removeHighlightsInRange(selection: HighlightSelection): void {
  const highlights = getCache()
  const filtered = highlights.filter(
    (hl) =>
      !(hl.book === selection.book && hl.chapter === selection.chapter && rangesOverlap(hl, selection)),
  )
  if (filtered.length === highlights.length) return // No-op

  cache = filtered
  writeToStorage(cache)
  notifyListeners()
}

export function updateHighlightColor(id: string, color: HighlightColor): void {
  const highlights = getCache()
  const target = highlights.find((hl) => hl.id === id)
  if (!target) return

  target.color = color
  target.updatedAt = Date.now()
  cache = [...highlights]
  writeToStorage(cache)
  notifyListeners()
}

// --- Subscription ---
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
