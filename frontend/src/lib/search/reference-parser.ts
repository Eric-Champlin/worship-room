import { BOOK_ALIASES } from './book-aliases'

export interface ParsedReference {
  book: string
  chapter: number
  verse?: number
  verseEnd?: number
}

const REFERENCE_RE = /^(.+?)\s*(\d+)(?:\s*[:\s]\s*(\d+)(?:\s*-\s*(\d+))?)?$/

export function parseReference(input: string): ParsedReference | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(/\s+/g, ' ')
  const match = normalized.match(REFERENCE_RE)
  if (!match) return null

  const [, rawBook, chapterStr, verseStr, verseEndStr] = match

  const bookKey = rawBook.trim().toLowerCase()
  const book = BOOK_ALIASES.get(bookKey)
  if (!book) return null

  const chapter = Number(chapterStr)
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) {
    return null
  }

  const result: ParsedReference = { book: book.slug, chapter }

  if (verseStr !== undefined) {
    const verse = Number(verseStr)
    if (Number.isInteger(verse) && verse >= 1) {
      result.verse = verse
    }
  }

  if (verseEndStr !== undefined) {
    const verseEnd = Number(verseEndStr)
    if (Number.isInteger(verseEnd) && verseEnd >= 1) {
      result.verseEnd = verseEnd
    }
  }

  return result
}
