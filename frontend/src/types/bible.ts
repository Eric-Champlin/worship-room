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

/** A personal note attached to a verse */
export interface BibleNote {
  id: string
  book: string
  chapter: number
  verseNumber: number
  text: string
  createdAt: string
  updatedAt: string
}
