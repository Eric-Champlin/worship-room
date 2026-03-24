import { BIBLE_BOOKS } from '@/constants/bible'

export interface ParsedVerseReference {
  raw: string // Original matched text, e.g., "Romans 8:28"
  book: string // Full book name, e.g., "Romans"
  bookSlug: string // URL slug, e.g., "romans"
  chapter: number // e.g., 8
  verseStart: number // e.g., 28
  verseEnd?: number // e.g., 3 for "23:1-3" (undefined for single verses)
  startIndex: number // Position in source string
  endIndex: number // End position in source string
}

// Build lookup maps from BIBLE_BOOKS (O(1) lookup)
const bookNameToSlug = new Map<string, string>()
const bookNameToFullName = new Map<string, string>()

for (const book of BIBLE_BOOKS) {
  const lower = book.name.toLowerCase()
  bookNameToSlug.set(lower, book.slug)
  bookNameToFullName.set(lower, book.name)
}

// Add "Psalm" → "Psalms" alias
bookNameToSlug.set('psalm', 'psalms')
bookNameToFullName.set('psalm', 'Psalms')

// Build book name alternation for regex, sorted by length descending to avoid partial matches
// (e.g., "1 John" before "John", "Song of Solomon" before "Song")
const allBookNames = [
  ...BIBLE_BOOKS.map((b) => b.name),
  'Psalm', // singular alias
]
allBookNames.sort((a, b) => b.length - a.length)

// Escape regex special chars in book names (none expected, but defensive)
const escaped = allBookNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const bookPattern = escaped.join('|')

// Pattern: (BookName) space (chapter):(verseStart)(optional -verseEnd)
// Uses word boundary before the match to avoid partial word matches
const VERSE_REGEX = new RegExp(
  `(?:^|(?<=\\s|"|"|\\(|,))(${bookPattern})\\s+(\\d+):(\\d+)(?:-(\\d+))?`,
  'gi',
)

export function parseVerseReferences(text: string): ParsedVerseReference[] {
  const results: ParsedVerseReference[] = []

  // Reset regex lastIndex for each call
  VERSE_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = VERSE_REGEX.exec(text)) !== null) {
    const [fullMatch, bookName, chapterStr, verseStartStr, verseEndStr] = match
    const lowerBook = bookName.toLowerCase()

    const slug = bookNameToSlug.get(lowerBook)
    const fullName = bookNameToFullName.get(lowerBook)

    if (!slug || !fullName) continue

    results.push({
      raw: fullMatch.trim(),
      book: fullName,
      bookSlug: slug,
      chapter: parseInt(chapterStr, 10),
      verseStart: parseInt(verseStartStr, 10),
      verseEnd: verseEndStr ? parseInt(verseEndStr, 10) : undefined,
      startIndex: match.index + (fullMatch.length - fullMatch.trimStart().length),
      endIndex: match.index + fullMatch.length,
    })
  }

  return results
}
