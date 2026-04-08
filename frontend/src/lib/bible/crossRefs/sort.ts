import { BIBLE_BOOKS } from '@/constants/bible'
import type { CrossRef } from '@/types/bible'

const BOOK_ORDER = new Map(BIBLE_BOOKS.map((b, i) => [b.slug, i]))

/** Sort by rank ascending (strongest first). Stable within equal ranks. */
export function sortByStrength(refs: CrossRef[]): CrossRef[] {
  return [...refs].sort((a, b) => a.rank - b.rank)
}

/** Sort by canonical Bible order: book order → chapter → verse. */
export function sortByCanonicalOrder(refs: CrossRef[]): CrossRef[] {
  return [...refs].sort((a, b) => {
    const bookDiff = (BOOK_ORDER.get(a.parsed.book) ?? 999) - (BOOK_ORDER.get(b.parsed.book) ?? 999)
    if (bookDiff !== 0) return bookDiff
    const chapterDiff = a.parsed.chapter - b.parsed.chapter
    if (chapterDiff !== 0) return chapterDiff
    return a.parsed.verse - b.parsed.verse
  })
}
