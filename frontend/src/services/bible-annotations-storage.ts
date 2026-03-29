import { BIBLE_HIGHLIGHTS_KEY, BIBLE_NOTES_KEY, BIBLE_BOOKS } from '@/constants/bible'
import type { BibleHighlight, BibleNote } from '@/types/bible'

type AnnotationItem =
  | (BibleHighlight & { type: 'highlight' })
  | (BibleNote & { type: 'note' })

export function getRecentBibleAnnotations(limit: number = 3): AnnotationItem[] {
  const highlights = readHighlightsStatic().map((h) => ({ ...h, type: 'highlight' as const }))
  const notes = readNotesStatic().map((n) => ({ ...n, type: 'note' as const }))

  return [...highlights, ...notes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

export function getBookDisplayName(slug: string): string {
  const book = BIBLE_BOOKS.find((b) => b.slug === slug)
  return book?.name ?? slug
}

export function formatVerseReference(bookSlug: string, chapter: number, verseNumber: number): string {
  return `${getBookDisplayName(bookSlug)} ${chapter}:${verseNumber}`
}

function readHighlightsStatic(): BibleHighlight[] {
  try {
    const raw = localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return []
  }
}

function readNotesStatic(): BibleNote[] {
  try {
    const raw = localStorage.getItem(BIBLE_NOTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return []
  }
}
