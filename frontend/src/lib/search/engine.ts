/**
 * BB-42: Runtime search engine for Bible full-text search.
 *
 * Pure TypeScript — no React imports. Loads the pre-built inverted index,
 * performs AND-style multi-word matching, scores results by relevance,
 * and returns paginated results.
 */

import { BIBLE_BOOKS } from '@/constants/bible'
import { loadChapterWeb } from '@/data/bible'
import { tokenize, tokenizeWithPositions } from './tokenizer'
import type { SearchIndex, SearchOptions, SearchResult, VerseRef } from './types'

// Module-level cache — loaded once on first search
let cachedIndex: SearchIndex | null = null

/** Book slug → canonical order index (for tiebreaking) */
const BOOK_ORDER = new Map(BIBLE_BOOKS.map((b, i) => [b.slug, i]))

/** Book slug → display name */
const BOOK_NAMES = new Map(BIBLE_BOOKS.map((b) => [b.slug, b.name]))

// ── Index Loading ──────────────────────────────────────────────────

export function isIndexLoaded(): boolean {
  return cachedIndex !== null
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex

  const response = await fetch('/search/bible-index.json')
  if (!response.ok) {
    throw new Error(`Failed to load search index: ${response.status}`)
  }

  cachedIndex = (await response.json()) as SearchIndex
  return cachedIndex
}

/** Reset the cached index (for testing only) */
export function _resetIndexCache(): void {
  cachedIndex = null
}

// ── Search ─────────────────────────────────────────────────────────

interface ScoredRef {
  ref: VerseRef
  score: number
  matchedTokens: string[]
}

/**
 * Search the Bible using the pre-loaded inverted index.
 * Returns scored, paginated results (without verse text — use loadVerseTexts).
 *
 * The index must be loaded first via loadSearchIndex().
 */
export function searchBible(
  query: string,
  options: SearchOptions = {},
): { results: SearchResult[]; total: number } {
  const { pageSize = 50, page = 0, recentBooks = [] } = options

  if (!cachedIndex) {
    return { results: [], total: 0 }
  }

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    return { results: [], total: 0 }
  }

  // Look up each query token in the index
  const tokenRefSets: Array<{ token: string; refs: VerseRef[] }> = []
  for (const token of queryTokens) {
    const refs = cachedIndex.tokens[token]
    if (!refs || refs.length === 0) {
      // AND semantics: if any token has zero results, the intersection is empty
      return { results: [], total: 0 }
    }
    tokenRefSets.push({ token, refs })
  }

  // Sort by smallest set first for efficient intersection
  tokenRefSets.sort((a, b) => a.refs.length - b.refs.length)

  // Build intersection — find refs that appear in ALL token result sets
  const recentBooksSet = new Set(recentBooks)
  let matched: ScoredRef[]

  if (tokenRefSets.length === 1) {
    // Single-token query — no intersection needed
    matched = tokenRefSets[0].refs.map((ref) => ({
      ref,
      score: scoreVerse(ref, queryTokens, recentBooksSet),
      matchedTokens: [tokenRefSets[0].token],
    }))
  } else {
    // Multi-token AND intersection
    const baseRefs = tokenRefSets[0].refs
    const otherSets = tokenRefSets.slice(1).map(({ refs }) => {
      const set = new Set<string>()
      for (const ref of refs) {
        set.add(`${ref[0]}:${ref[1]}:${ref[2]}`)
      }
      return set
    })

    matched = []
    for (const ref of baseRefs) {
      const key = `${ref[0]}:${ref[1]}:${ref[2]}`
      if (otherSets.every((s) => s.has(key))) {
        matched.push({
          ref,
          score: scoreVerse(ref, queryTokens, recentBooksSet),
          matchedTokens: queryTokens,
        })
      }
    }
  }

  // Sort by score descending, then canonical book order, chapter, verse
  matched.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const orderA = BOOK_ORDER.get(a.ref[0]) ?? 999
    const orderB = BOOK_ORDER.get(b.ref[0]) ?? 999
    if (orderA !== orderB) return orderA - orderB
    if (a.ref[1] !== b.ref[1]) return a.ref[1] - b.ref[1]
    return a.ref[2] - b.ref[2]
  })

  const total = matched.length
  const pageSlice = matched.slice(page * pageSize, (page + 1) * pageSize)

  const results: SearchResult[] = pageSlice.map(({ ref, score, matchedTokens }) => ({
    bookSlug: ref[0],
    bookName: BOOK_NAMES.get(ref[0]) ?? ref[0],
    chapter: ref[1],
    verse: ref[2],
    text: '', // Hydrated separately via loadVerseTexts
    score,
    matchedTokens,
  }))

  return { results, total }
}

function scoreVerse(
  ref: VerseRef,
  queryTokens: string[],
  recentBooks: Set<string>,
): number {
  let score = queryTokens.length // Base: 1 point per matched token

  // Recency bonus: +1 if user has read this book recently
  if (recentBooks.has(ref[0])) {
    score += 1
  }

  return score
}

// ── Proximity Scoring (post-hoc, after verse text is loaded) ──────

/**
 * Apply proximity bonus to results that have verse text loaded.
 * All query tokens appearing within 5 word positions = +2 bonus.
 *
 * Also applies the length penalty (-0.5 for verses > 200 chars) to all results.
 */
export function applyProximityBonus(
  results: SearchResult[],
  queryTokens: string[],
): void {
  for (const result of results) {
    if (!result.text) continue

    // Length penalty: -0.5 for long verses (>200 chars) — applies to all queries
    if (result.text.length > 200) {
      result.score -= 0.5
    }

    // Proximity bonus only applies to multi-word queries
    if (queryTokens.length < 2) continue

    const positions = tokenizeWithPositions(result.text)
    const tokenPositions = new Map<string, number[]>()

    for (const [token, pos] of positions) {
      if (!tokenPositions.has(token)) {
        tokenPositions.set(token, [])
      }
      tokenPositions.get(token)!.push(pos)
    }

    // Check if all query tokens appear within a window of 5 positions
    const allTokenPositions = queryTokens.map((t) => tokenPositions.get(t))
    if (allTokenPositions.some((p) => !p || p.length === 0)) continue

    // Find minimum span containing one occurrence of each token
    const minSpan = findMinSpan(allTokenPositions as number[][])
    if (minSpan <= 5) {
      result.score += 2
    }
  }
}

function findMinSpan(positionLists: number[][]): number {
  if (positionLists.length === 0) return Infinity

  // Simple approach: try each position of the first token, find closest match
  // for all other tokens, compute span
  let minSpan = Infinity

  for (const pos of positionLists[0]) {
    let lo = pos
    let hi = pos

    for (let i = 1; i < positionLists.length; i++) {
      // Find closest position to pos in this list
      let closest = positionLists[i][0]
      let closestDist = Math.abs(closest - pos)

      for (const p of positionLists[i]) {
        const dist = Math.abs(p - pos)
        if (dist < closestDist) {
          closest = p
          closestDist = dist
        }
      }

      lo = Math.min(lo, closest)
      hi = Math.max(hi, closest)
    }

    const span = hi - lo
    if (span < minSpan) minSpan = span
  }

  return minSpan
}

// ── Verse Text Loading ─────────────────────────────────────────────

/**
 * Batch-load verse text for a set of search results.
 * Groups refs by book, loads each book's chapter once, extracts verse text.
 * Returns a map of "bookSlug:chapter:verse" → text.
 */
export async function loadVerseTexts(
  refs: VerseRef[],
): Promise<Map<string, string>> {
  const textMap = new Map<string, string>()

  // Group refs by book+chapter for efficient loading
  const chapterRefs = new Map<string, VerseRef[]>()
  for (const ref of refs) {
    const chapterKey = `${ref[0]}:${ref[1]}`
    if (!chapterRefs.has(chapterKey)) {
      chapterRefs.set(chapterKey, [])
    }
    chapterRefs.get(chapterKey)!.push(ref)
  }

  // Load all needed chapters in parallel
  const loadPromises = Array.from(chapterRefs.entries()).map(
    async ([chapterKey, refsInChapter]) => {
      const [bookSlug, chapterStr] = chapterKey.split(':')
      const chapter = Number(chapterStr)

      const chapterData = await loadChapterWeb(bookSlug, chapter)
      if (!chapterData) return

      for (const ref of refsInChapter) {
        const verse = chapterData.verses.find((v) => v.number === ref[2])
        if (verse) {
          textMap.set(`${ref[0]}:${ref[1]}:${ref[2]}`, verse.text)
        }
      }
    },
  )

  await Promise.all(loadPromises)
  return textMap
}
