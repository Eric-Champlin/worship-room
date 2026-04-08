/**
 * @deprecated Use the highlight store module (`lib/bible/highlightStore`) instead.
 * This hook has auth-gating that conflicts with BB-7 spec (highlights are public).
 * The store module supports range-based highlights, subscribe/unsubscribe, and auto-migration.
 * Will be removed after BB-14.
 */
import { useCallback, useState } from 'react'

import { BIBLE_HIGHLIGHTS_KEY, MAX_HIGHLIGHTS } from '@/constants/bible'
import { useAuth } from '@/hooks/useAuth'
import type { BibleHighlight } from '@/types/bible'

function readHighlights(): BibleHighlight[] {
  try {
    const raw = localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as BibleHighlight[]
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return []
  }
}

function writeHighlights(data: BibleHighlight[]): void {
  try {
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(data))
  } catch (_e) {
    // localStorage may be unavailable or quota exceeded
  }
}

export function useBibleHighlights(): {
  getHighlightsForChapter: (book: string, chapter: number) => BibleHighlight[]
  getHighlightForVerse: (book: string, chapter: number, verseNumber: number) => BibleHighlight | undefined
  setHighlight: (book: string, chapter: number, verseNumber: number, color: string) => void
  removeHighlight: (book: string, chapter: number, verseNumber: number) => void
  getAllHighlights: () => BibleHighlight[]
} {
  const { isAuthenticated } = useAuth()
  const [highlights, setHighlights] = useState<BibleHighlight[]>(readHighlights)

  const getHighlightsForChapter = useCallback(
    (book: string, chapter: number): BibleHighlight[] => {
      return highlights.filter((h) => h.book === book && h.chapter === chapter)
    },
    [highlights],
  )

  const getHighlightForVerse = useCallback(
    (book: string, chapter: number, verseNumber: number): BibleHighlight | undefined => {
      return highlights.find(
        (h) => h.book === book && h.chapter === chapter && h.verseNumber === verseNumber,
      )
    },
    [highlights],
  )

  const setHighlight = useCallback(
    (book: string, chapter: number, verseNumber: number, color: string): void => {
      if (!isAuthenticated) return

      const current = readHighlights()
      const existingIndex = current.findIndex(
        (h) => h.book === book && h.chapter === chapter && h.verseNumber === verseNumber,
      )

      let updated: BibleHighlight[]

      if (existingIndex !== -1) {
        if (current[existingIndex].color === color) {
          // Toggle off: same color = remove
          updated = current.filter((_, i) => i !== existingIndex)
        } else {
          // Switch color
          updated = current.map((h, i) =>
            i === existingIndex ? { ...h, color, createdAt: new Date().toISOString() } : h,
          )
        }
      } else {
        // New highlight
        const newHighlight: BibleHighlight = {
          book,
          chapter,
          verseNumber,
          color,
          createdAt: new Date().toISOString(),
        }
        updated = [...current, newHighlight]

        // Prune oldest if over limit
        if (updated.length > MAX_HIGHLIGHTS) {
          updated.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          updated = updated.slice(updated.length - MAX_HIGHLIGHTS)
        }
      }

      writeHighlights(updated)
      setHighlights(updated)
    },
    [isAuthenticated],
  )

  const removeHighlight = useCallback(
    (book: string, chapter: number, verseNumber: number): void => {
      if (!isAuthenticated) return

      const current = readHighlights()
      const updated = current.filter(
        (h) => !(h.book === book && h.chapter === chapter && h.verseNumber === verseNumber),
      )
      writeHighlights(updated)
      setHighlights(updated)
    },
    [isAuthenticated],
  )

  const getAllHighlights = useCallback((): BibleHighlight[] => {
    return highlights
  }, [highlights])

  return {
    getHighlightsForChapter,
    getHighlightForVerse,
    setHighlight,
    removeHighlight,
    getAllHighlights,
  }
}
