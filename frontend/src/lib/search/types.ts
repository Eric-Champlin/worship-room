/** Compact verse reference tuple: [bookSlug, chapter, verse] */
export type VerseRef = [string, number, number]

/** The inverted index structure stored on disk */
export interface SearchIndex {
  version: 1
  generatedAt: string
  totalVerses: number
  tokens: Record<string, VerseRef[]>
}

/** Scoring options for search */
export interface SearchOptions {
  /** Max results per page (default 50) */
  pageSize?: number
  /** Page number (0-indexed, default 0) */
  page?: number
  /** Book slugs the user has read recently (for recency bonus) */
  recentBooks?: string[]
}

/** A single search result with score */
export interface SearchResult {
  bookSlug: string
  bookName: string
  chapter: number
  verse: number
  text: string
  score: number
  /** Which query tokens matched in this verse */
  matchedTokens: string[]
}
