import { BIBLE_BOOKS } from '@/constants/bible'
import { loadChapterWeb } from '@/data/bible/index'
import type { VerseContext, VerseContextPartial } from '@/types/daily-experience'

export function parseVerseContextFromUrl(
  searchParams: URLSearchParams,
): VerseContextPartial | null {
  const book = searchParams.get('verseBook')
  const chapterStr = searchParams.get('verseChapter')
  const startStr = searchParams.get('verseStart')
  const endStr = searchParams.get('verseEnd')
  const src = searchParams.get('src')

  if (!book || !chapterStr || !startStr || !endStr || src !== 'bible') return null

  const chapter = parseInt(chapterStr, 10)
  const startVerse = parseInt(startStr, 10)
  const endVerse = parseInt(endStr, 10)

  if (isNaN(chapter) || isNaN(startVerse) || isNaN(endVerse)) return null
  if (chapter < 1 || startVerse < 1 || endVerse < startVerse) return null

  const bookMeta = BIBLE_BOOKS.find((b) => b.slug === book)
  if (!bookMeta) return null
  if (chapter > bookMeta.chapters) return null

  return { book, chapter, startVerse, endVerse, source: 'bible' }
}

export function formatReference(
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
): string {
  if (startVerse === endVerse) return `${bookName} ${chapter}:${startVerse}`
  return `${bookName} ${chapter}:${startVerse}\u2013${endVerse}`
}

export async function hydrateVerseContext(
  partial: VerseContextPartial,
): Promise<VerseContext | null> {
  const chapterData = await loadChapterWeb(partial.book, partial.chapter)
  if (!chapterData) return null

  const verses = chapterData.verses.filter(
    (v) => v.number >= partial.startVerse && v.number <= partial.endVerse,
  )
  if (verses.length === 0) return null

  const bookMeta = BIBLE_BOOKS.find((b) => b.slug === partial.book)
  if (!bookMeta) return null

  return {
    ...partial,
    verses,
    reference: formatReference(bookMeta.name, partial.chapter, partial.startVerse, partial.endVerse),
  }
}
