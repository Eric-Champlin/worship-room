import { useCallback, useState } from 'react'

import { BIBLE_PROGRESS_KEY, BIBLE_BOOKS } from '@/constants/bible'
import { useAuth } from '@/hooks/useAuth'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import type { BibleProgressMap } from '@/types/bible'

function readProgress(): BibleProgressMap {
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

function writeProgress(data: BibleProgressMap): void {
  try {
    localStorage.setItem(BIBLE_PROGRESS_KEY, JSON.stringify(data))
  } catch {
    // Silently fail on quota exceeded
  }
}

export function useBibleProgress(): {
  progress: BibleProgressMap
  markChapterRead: (bookSlug: string, chapter: number) => void
  getBookProgress: (bookSlug: string) => number[]
  isChapterRead: (bookSlug: string, chapter: number) => boolean
  justCompletedBook: string | null
  clearJustCompletedBook: () => void
  getCompletedBookCount: () => number
} {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<BibleProgressMap>(readProgress)
  const [justCompletedBook, setJustCompletedBook] = useState<string | null>(null)

  const markChapterRead = useCallback(
    (bookSlug: string, chapter: number) => {
      if (!isAuthenticated) return
      const current = readProgress()
      const bookProgress = current[bookSlug] ?? []
      if (bookProgress.includes(chapter)) return
      const updated = { ...current, [bookSlug]: [...bookProgress, chapter] }
      writeProgress(updated)
      setProgress(updated)

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
      const bookData = BIBLE_BOOKS.find(b => b.slug === bookSlug)
      if (bookData) {
        const updatedBookProgress = updated[bookSlug] ?? []
        if (updatedBookProgress.length >= bookData.chapters) {
          setJustCompletedBook(bookSlug)
        }
      }
    },
    [isAuthenticated],
  )

  const clearJustCompletedBook = useCallback(() => {
    setJustCompletedBook(null)
  }, [])

  const getCompletedBookCount = useCallback((): number => {
    if (!isAuthenticated) return 0
    const current = readProgress()
    return BIBLE_BOOKS.filter(book => {
      const chapters = current[book.slug] ?? []
      return chapters.length >= book.chapters
    }).length
  }, [isAuthenticated, progress])

  const getBookProgress = useCallback(
    (bookSlug: string): number[] => {
      if (!isAuthenticated) return []
      return progress[bookSlug] ?? []
    },
    [isAuthenticated, progress],
  )

  const isChapterRead = useCallback(
    (bookSlug: string, chapter: number): boolean => {
      if (!isAuthenticated) return false
      return (progress[bookSlug] ?? []).includes(chapter)
    },
    [isAuthenticated, progress],
  )

  return { progress, markChapterRead, getBookProgress, isChapterRead, justCompletedBook, clearJustCompletedBook, getCompletedBookCount }
}
