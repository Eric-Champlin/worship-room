import { getAllVisits } from './chapterVisitStore'
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllBookmarks } from '@/lib/bible/bookmarkStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import { BIBLE_BOOKS } from '@/constants/bible'
import { getTodayLocal } from '@/lib/bible/dateUtils'
import type { DailyActivity, BookCoverage, HeatmapIntensity } from '@/types/heatmap'
import type { BibleProgressMap } from '@/types/bible'

/** Converts an epoch-ms timestamp to a YYYY-MM-DD string in local timezone. */
function epochToLocalDate(epochMs: number): string {
  const d = new Date(epochMs)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns date N days before the given YYYY-MM-DD date. */
function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns the next date after the given YYYY-MM-DD. */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Whether the year containing the given date is a leap year. */
function isLeapYear(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4), 10)
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Returns a 365-day array (366 in leap years) ending today.
 * Each entry contains the date, chapter count, and chapter references.
 * Merges chapter visits + highlight/note/bookmark timestamps.
 */
export function getDailyActivityForLastYear(): DailyActivity[] {
  const today = getTodayLocal()
  const daysInYear = isLeapYear(today) ? 366 : 365
  const startDate = subtractDays(today, daysInYear - 1)

  // Build a map: date → Set<"book:chapter"> for deduplication
  const dateMap = new Map<string, Map<string, { book: string; chapter: number }>>()

  function addEntry(date: string, book: string, chapter: number) {
    if (date < startDate || date > today) return
    let entries = dateMap.get(date)
    if (!entries) {
      entries = new Map()
      dateMap.set(date, entries)
    }
    const key = `${book}:${chapter}`
    if (!entries.has(key)) {
      entries.set(key, { book, chapter })
    }
  }

  // Primary source: chapter visits
  const visits = getAllVisits()
  for (const [date, chapters] of Object.entries(visits)) {
    for (const { book, chapter } of chapters) {
      addEntry(date, book, chapter)
    }
  }

  // Supplementary: highlights
  for (const highlight of getAllHighlights()) {
    const date = epochToLocalDate(highlight.createdAt)
    addEntry(date, highlight.book, highlight.chapter)
  }

  // Supplementary: bookmarks
  for (const bookmark of getAllBookmarks()) {
    const date = epochToLocalDate(bookmark.createdAt)
    addEntry(date, bookmark.book, bookmark.chapter)
  }

  // Supplementary: notes
  for (const note of getAllNotes()) {
    const date = epochToLocalDate(note.createdAt)
    addEntry(date, note.book, note.chapter)
  }

  // Build the output array, ordered oldest → newest
  const result: DailyActivity[] = []
  let current = startDate
  for (let i = 0; i < daysInYear; i++) {
    const entries = dateMap.get(current)
    const chapters = entries ? Array.from(entries.values()) : []
    result.push({
      date: current,
      chapterCount: chapters.length,
      chapters,
    })
    current = addOneDay(current)
  }

  return result
}

/** Maps a chapter count to a 5-state intensity level. */
export function getIntensity(chapterCount: number): HeatmapIntensity {
  if (chapterCount === 0) return 0
  if (chapterCount <= 2) return 1
  if (chapterCount <= 5) return 2
  if (chapterCount <= 9) return 3
  return 4
}

/**
 * Returns a 66-element array in canonical order.
 * Each entry contains the book metadata, read chapters, and highlighted chapters.
 */
export function getBibleCoverage(progress: BibleProgressMap): BookCoverage[] {
  // Build a Map<bookSlug, Set<number>> of highlighted chapters
  const highlightMap = new Map<string, Set<number>>()
  for (const highlight of getAllHighlights()) {
    let chapters = highlightMap.get(highlight.book)
    if (!chapters) {
      chapters = new Set()
      highlightMap.set(highlight.book, chapters)
    }
    chapters.add(highlight.chapter)
  }

  return BIBLE_BOOKS.map((book) => ({
    name: book.name,
    slug: book.slug,
    testament: book.testament,
    totalChapters: book.chapters,
    readChapters: new Set(progress[book.slug] ?? []),
    highlightedChapters: highlightMap.get(book.slug) ?? new Set(),
  }))
}

/** Counts the total number of active reading days in the past year. */
export function countActiveDays(activity: DailyActivity[]): number {
  return activity.filter((d) => d.chapterCount > 0).length
}

/** Counts the total distinct chapters read across all books. */
export function countTotalChaptersRead(progress: BibleProgressMap): number {
  return Object.values(progress).reduce((sum, chapters) => sum + chapters.length, 0)
}

/** Counts books that have at least one chapter read. */
export function countBooksVisited(progress: BibleProgressMap): number {
  return Object.values(progress).filter((chapters) => chapters.length > 0).length
}
