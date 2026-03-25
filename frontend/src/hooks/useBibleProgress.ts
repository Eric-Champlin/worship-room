import { useCallback, useState } from 'react'

import { BIBLE_PROGRESS_KEY } from '@/constants/bible'
import { useAuth } from '@/hooks/useAuth'
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
} {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<BibleProgressMap>(readProgress)

  const markChapterRead = useCallback(
    (bookSlug: string, chapter: number) => {
      if (!isAuthenticated) return
      const current = readProgress()
      const bookProgress = current[bookSlug] ?? []
      if (bookProgress.includes(chapter)) return
      const updated = { ...current, [bookSlug]: [...bookProgress, chapter] }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated],
  )

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

  return { progress, markChapterRead, getBookProgress, isChapterRead }
}
