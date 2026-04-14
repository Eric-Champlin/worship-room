import { BIBLE_BOOKS, HIGHLIGHT_EMOTIONS } from '@/constants/bible'
import { getAllHighlights } from '@/lib/bible/highlightStore'
import { getAllNotes } from '@/lib/bible/notes/store'
import type { BibleHighlight, BibleNote, HighlightColor } from '@/types/bible'

const COLOR_HEX_MAP: Record<HighlightColor, string> = Object.fromEntries(
  HIGHLIGHT_EMOTIONS.map((e) => [e.key, e.hex]),
) as Record<HighlightColor, string>

type AnnotationItem =
  | (BibleHighlight & { type: 'highlight' })
  | (BibleNote & { type: 'note' })

export function getRecentBibleAnnotations(limit: number = 3): AnnotationItem[] {
  const highlights = getAllHighlights().map((hl) => ({
    book: hl.book,
    chapter: hl.chapter,
    verseNumber: hl.startVerse,
    color: COLOR_HEX_MAP[hl.color] ?? hl.color,
    createdAt: new Date(hl.createdAt).toISOString(),
    type: 'highlight' as const,
  }))
  const notes = getAllNotes().map((n) => ({
    id: n.id,
    book: n.book,
    chapter: n.chapter,
    verseNumber: n.startVerse,
    text: n.body,
    createdAt: new Date(n.createdAt).toISOString(),
    updatedAt: new Date(n.updatedAt).toISOString(),
    type: 'note' as const,
  }))

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
