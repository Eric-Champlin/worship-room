import { useCallback, useEffect, useRef, useState } from 'react'
import { selectVotdForDate, getDayOfYear } from '@/lib/bible/votdSelector'
import { loadChapterWeb } from '@/data/bible'
import { BIBLE_BOOKS } from '@/constants/bible'
import { useTimeTick } from './useTimeTick'
import type { VotdHydrated } from '@/types/bible-landing'

const FALLBACK_TEXT =
  'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.'
const FALLBACK_REF = 'John 3:16'

export function useVerseOfTheDay(date?: Date): {
  votd: VotdHydrated | null
  isLoading: boolean
} {
  const [votd, setVotd] = useState<VotdHydrated | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const currentDayRef = useRef<number>(0)
  const { currentMinute } = useTimeTick()

  const loadVotd = useCallback(async (targetDate: Date) => {
    const entry = selectVotdForDate(targetDate)
    const dayOfYear = getDayOfYear(targetDate)
    currentDayRef.current = dayOfYear

    try {
      const chapter = await loadChapterWeb(entry.book, entry.chapter)
      if (!chapter) {
        console.error(`VOTD: Chapter not found for ${entry.ref} (${entry.book} ${entry.chapter})`)
        setVotd({
          entry: {
            ref: FALLBACK_REF,
            book: 'john',
            chapter: 3,
            startVerse: 16,
            endVerse: 16,
            theme: 'love',
          },
          verseText: FALLBACK_TEXT,
          bookName: 'John',
          wordCount: FALLBACK_TEXT.split(/\s+/).length,
        })
        setIsLoading(false)
        return
      }

      const matchingVerses = chapter.verses.filter(
        (v) => v.number >= entry.startVerse && v.number <= entry.endVerse,
      )

      if (matchingVerses.length === 0) {
        console.error(
          `VOTD: Verses ${entry.startVerse}-${entry.endVerse} not found in ${entry.ref}`,
        )
        setVotd({
          entry: {
            ref: FALLBACK_REF,
            book: 'john',
            chapter: 3,
            startVerse: 16,
            endVerse: 16,
            theme: 'love',
          },
          verseText: FALLBACK_TEXT,
          bookName: 'John',
          wordCount: FALLBACK_TEXT.split(/\s+/).length,
        })
        setIsLoading(false)
        return
      }

      const verseText = matchingVerses.map((v) => v.text).join(' ')
      const bookName = BIBLE_BOOKS.find((b) => b.slug === entry.book)?.name ?? entry.book

      setVotd({
        entry,
        verseText,
        bookName,
        wordCount: verseText.split(/\s+/).length,
      })
    } catch (err) {
      console.error('VOTD: Failed to load verse text', err)
      setVotd({
        entry: {
          ref: FALLBACK_REF,
          book: 'john',
          chapter: 3,
          startVerse: 16,
          endVerse: 16,
          theme: 'love',
        },
        verseText: FALLBACK_TEXT,
        bookName: 'John',
        wordCount: FALLBACK_TEXT.split(/\s+/).length,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadVotd(date ?? new Date())
  }, [date, loadVotd])

  // Midnight polling via shared time tick (only when no fixed date is provided)
  useEffect(() => {
    if (date) return // Skip polling for fixed dates
    const now = new Date()
    const todayDay = getDayOfYear(now)
    if (todayDay !== currentDayRef.current) {
      setIsLoading(true)
      loadVotd(now)
    }
  }, [date, loadVotd, currentMinute])

  return { votd, isLoading }
}
