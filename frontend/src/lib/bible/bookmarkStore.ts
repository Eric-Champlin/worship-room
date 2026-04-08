import { BIBLE_BOOKMARKS_KEY } from '@/constants/bible'
import type { Bookmark } from '@/types/bible'

// --- Module-level state ---
let cache: Bookmark[] | null = null
const listeners = new Set<() => void>()

// --- Error class ---
export class BookmarkStorageFullError extends Error {
  constructor() {
    super('Storage full — export your bookmarks and clear old ones.')
    this.name = 'BookmarkStorageFullError'
  }
}

// --- ID generation ---
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// --- Validation ---
function isValidBookmark(record: unknown): record is Bookmark {
  if (typeof record !== 'object' || record === null) return false
  const r = record as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.book === 'string' &&
    typeof r.chapter === 'number' &&
    typeof r.startVerse === 'number' &&
    typeof r.endVerse === 'number' &&
    typeof r.createdAt === 'number'
  )
}

// --- Storage I/O ---
function readFromStorage(): Bookmark[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(BIBLE_BOOKMARKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidBookmark)
  } catch {
    return []
  }
}

function writeToStorage(data: Bookmark[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(BIBLE_BOOKMARKS_KEY, JSON.stringify(data))
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      throw new BookmarkStorageFullError()
    }
  }
}

function getCache(): Bookmark[] {
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
export function getAllBookmarks(): Bookmark[] {
  return [...getCache()]
}

export function getBookmarksForChapter(book: string, chapter: number): Bookmark[] {
  return getCache().filter((bm) => bm.book === book && bm.chapter === chapter)
}

export function getBookmarkForVerse(book: string, chapter: number, verse: number): Bookmark | null {
  return (
    getCache().find(
      (bm) => bm.book === book && bm.chapter === chapter && verse >= bm.startVerse && verse <= bm.endVerse,
    ) ?? null
  )
}

export function isSelectionBookmarked(
  book: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): boolean {
  return getCache().some(
    (bm) =>
      bm.book === book &&
      bm.chapter === chapter &&
      rangesOverlap(bm, { startVerse, endVerse }),
  )
}

// --- Write API ---
export interface BookmarkSelection {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
}

function rangesOverlap(
  a: { startVerse: number; endVerse: number },
  b: { startVerse: number; endVerse: number },
): boolean {
  return a.startVerse <= b.endVerse && a.endVerse >= b.startVerse
}

export function toggleBookmark(
  selection: BookmarkSelection,
): { created: boolean; bookmark: Bookmark | null; removed?: Bookmark[] } {
  const bookmarks = getCache()

  // Find overlapping bookmarks in the same book + chapter
  const overlapping: Bookmark[] = []
  const nonOverlapping: Bookmark[] = []

  for (const bm of bookmarks) {
    if (
      bm.book === selection.book &&
      bm.chapter === selection.chapter &&
      rangesOverlap(bm, selection)
    ) {
      overlapping.push(bm)
    } else {
      nonOverlapping.push(bm)
    }
  }

  // If any overlapping, remove all of them
  if (overlapping.length > 0) {
    cache = nonOverlapping
    writeToStorage(cache)
    notifyListeners()
    return { created: false, bookmark: null, removed: overlapping }
  }

  // No overlapping — create new bookmark
  const newBookmark: Bookmark = {
    id: generateId(),
    book: selection.book,
    chapter: selection.chapter,
    startVerse: selection.startVerse,
    endVerse: selection.endVerse,
    createdAt: Date.now(),
  }

  cache = [...bookmarks, newBookmark]
  writeToStorage(cache)
  notifyListeners()
  return { created: true, bookmark: newBookmark }
}

export function setBookmarkLabel(id: string, label: string): void {
  const bookmarks = getCache()
  const idx = bookmarks.findIndex((bm) => bm.id === id)
  if (idx === -1) return

  const updated = { ...bookmarks[idx] }
  if (label === '') {
    delete updated.label
  } else {
    updated.label = label.slice(0, 80)
  }

  cache = bookmarks.map((bm, i) => (i === idx ? updated : bm))
  writeToStorage(cache)
  notifyListeners()
}

export function removeBookmark(id: string): void {
  const bookmarks = getCache()
  const filtered = bookmarks.filter((bm) => bm.id !== id)
  if (filtered.length === bookmarks.length) return

  cache = filtered
  writeToStorage(cache)
  notifyListeners()
}

export function removeBookmarksInRange(selection: BookmarkSelection): Bookmark[] {
  const bookmarks = getCache()
  const removed: Bookmark[] = []
  const remaining: Bookmark[] = []

  for (const bm of bookmarks) {
    if (
      bm.book === selection.book &&
      bm.chapter === selection.chapter &&
      rangesOverlap(bm, selection)
    ) {
      removed.push(bm)
    } else {
      remaining.push(bm)
    }
  }

  if (removed.length === 0) return []

  cache = remaining
  writeToStorage(cache)
  notifyListeners()
  return removed
}

export function restoreBookmarks(bookmarks: Bookmark[]): void {
  const current = getCache()
  const existingIds = new Set(current.map((bm) => bm.id))
  const toAdd = bookmarks.filter((bm) => !existingIds.has(bm.id))

  if (toAdd.length === 0) return

  cache = [...current, ...toAdd]
  writeToStorage(cache)
  notifyListeners()
}

// --- Testing ---
export function _resetCacheForTesting(): void {
  cache = null
}

// --- Subscription ---
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
