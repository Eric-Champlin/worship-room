/** Metadata for a single book of the Bible */
export interface BibleBook {
  /** Display name (e.g., "Genesis", "1 Corinthians") */
  name: string
  /** URL-safe slug (e.g., "genesis", "1-corinthians") */
  slug: string
  /** Total number of chapters */
  chapters: number
  /** Which testament */
  testament: 'old' | 'new'
  /** Traditional category grouping */
  category: BibleCategory
  /** Whether full WEB text is available in this build */
  hasFullText: boolean
}

export type BibleCategory =
  | 'pentateuch'
  | 'historical'
  | 'wisdom-poetry'
  | 'major-prophets'
  | 'minor-prophets'
  | 'gospels'
  | 'history'
  | 'pauline-epistles'
  | 'general-epistles'
  | 'prophecy'

export interface BibleVerse {
  number: number
  text: string
}

/** A chapter's complete verse data (loaded on demand) */
export interface BibleChapter {
  bookSlug: string
  chapter: number
  verses: BibleVerse[]
  paragraphs?: number[]
}

/** Search result from Bible text search */
export interface BibleSearchResult {
  bookName: string
  bookSlug: string
  chapter: number
  verseNumber: number
  verseText: string
  /** Verse before the match (if exists) */
  contextBefore?: string
  /** Verse after the match (if exists) */
  contextAfter?: string
}

/** Progress map: book slug -> array of completed chapter numbers */
export type BibleProgressMap = Record<string, number[]>

/** A single verse highlight annotation */
export interface BibleHighlight {
  book: string
  chapter: number
  verseNumber: number
  color: string
  createdAt: string
}

export type HighlightColor = 'peace' | 'conviction' | 'joy' | 'struggle' | 'promise'

export interface Highlight {
  id: string
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  color: HighlightColor
  createdAt: number
  updatedAt: number
}

export interface Bookmark {
  id: string
  book: string          // slug e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse
  label?: string        // optional, max 80 chars
  createdAt: number     // epoch ms
}

export interface Note {
  id: string
  book: string          // slug e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse
  body: string          // plain text, max 10,000 chars
  createdAt: number     // epoch ms
  updatedAt: number     // epoch ms
}

/** @deprecated BB-8 uses Note interface instead. Kept for pre-redesign compat. */
export interface BibleNote {
  id: string
  book: string
  chapter: number
  verseNumber: number
  text: string
  createdAt: string
  updatedAt: string
}
