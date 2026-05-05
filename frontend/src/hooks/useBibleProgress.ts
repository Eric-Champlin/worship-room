import { useCallback, useState, useSyncExternalStore } from 'react'

import { BIBLE_PROGRESS_KEY, BIBLE_BOOKS } from '@/constants/bible'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import type { BibleProgressMap } from '@/types/bible'

// --- Module-level reactive store state ---

let cache: BibleProgressMap | null = null
const listeners = new Set<() => void>()

function readFromStorage(): BibleProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as BibleProgressMap
  } catch {
    return {}
  }
}

function writeToStorage(data: BibleProgressMap): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable / quota exceeded — silent fail
  }
}

function getCache(): BibleProgressMap {
  if (cache === null) cache = readFromStorage()
  return cache
}

function notifyListeners(): void {
  for (const listener of listeners) listener()
}

// --- Cross-tab sync (Spec 8B Change 5c) ---
// When another tab writes to wr_bible_progress, invalidate cache and notify listeners
// so the in-tab consumers re-render with the new value.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === BIBLE_PROGRESS_KEY) {
      cache = null
      notifyListeners()
    }
  })
}

// --- Public API (named exports for non-React callers — e.g., BibleReader) ---

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProgressSnapshot(): BibleProgressMap {
  return getCache()
}

function getServerSnapshot(): BibleProgressMap {
  return {}
}

/** Mark a chapter as read. Idempotent: no-op if already in progress.
 *  Returns metadata about whether marking this chapter completed the book. */
export function markChapterRead(
  bookSlug: string,
  chapter: number,
): { justCompletedBook: string | null } {
  const current = getCache()
  const bookProgress = current[bookSlug] ?? []
  if (bookProgress.includes(chapter)) {
    return { justCompletedBook: null }
  }
  const updated: BibleProgressMap = { ...current, [bookSlug]: [...bookProgress, chapter] }
  cache = updated
  writeToStorage(updated)
  notifyListeners()

  // Increment Bible chapters read counter for badges
  const badgeData = getBadgeData()
  saveBadgeData({
    ...badgeData,
    activityCounts: {
      ...badgeData.activityCounts,
      bibleChaptersRead: badgeData.activityCounts.bibleChaptersRead + 1,
    },
  })

  // Check if the book is now complete
  const bookData = BIBLE_BOOKS.find((b) => b.slug === bookSlug)
  let justCompletedBook: string | null = null
  if (bookData) {
    const updatedBookProgress = updated[bookSlug] ?? []
    if (updatedBookProgress.length >= bookData.chapters) {
      justCompletedBook = bookSlug
    }
  }
  return { justCompletedBook }
}

// --- React hook (preserves the existing 7-property contract) ---

export function useBibleProgress(): {
  progress: BibleProgressMap
  markChapterRead: (bookSlug: string, chapter: number) => void
  getBookProgress: (bookSlug: string) => number[]
  isChapterRead: (bookSlug: string, chapter: number) => boolean
  justCompletedBook: string | null
  clearJustCompletedBook: () => void
  getCompletedBookCount: () => number
} {
  const progress = useSyncExternalStore(subscribeProgress, getProgressSnapshot, getServerSnapshot)
  const [justCompletedBook, setJustCompletedBook] = useState<string | null>(null)

  const markChapterReadHook = useCallback((bookSlug: string, chapter: number) => {
    const result = markChapterRead(bookSlug, chapter)
    if (result.justCompletedBook) {
      setJustCompletedBook(result.justCompletedBook)
    }
  }, [])

  const clearJustCompletedBook = useCallback(() => {
    setJustCompletedBook(null)
  }, [])

  const getCompletedBookCount = useCallback((): number => {
    const current = getCache()
    return BIBLE_BOOKS.filter((book) => {
      const chapters = current[book.slug] ?? []
      return chapters.length >= book.chapters
    }).length
  }, [])

  const getBookProgress = useCallback(
    (bookSlug: string): number[] => progress[bookSlug] ?? [],
    [progress],
  )

  const isChapterRead = useCallback(
    (bookSlug: string, chapter: number): boolean => (progress[bookSlug] ?? []).includes(chapter),
    [progress],
  )

  return {
    progress,
    markChapterRead: markChapterReadHook,
    getBookProgress,
    isChapterRead,
    justCompletedBook,
    clearJustCompletedBook,
    getCompletedBookCount,
  }
}

// --- Test helper ---

export function _resetForTesting(): void {
  cache = null
  listeners.clear()
}
