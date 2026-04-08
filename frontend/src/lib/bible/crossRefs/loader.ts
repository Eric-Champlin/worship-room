import { BIBLE_BOOKS } from '@/constants/bible'
import type { CrossRef, CrossRefBookJson, CrossRefMap } from '@/types/bible'

// --- Module-level cache ---
const cache = new Map<string, CrossRefMap>()
const inflight = new Map<string, Promise<CrossRefMap>>()

// --- Dynamic import map (same pattern as data/bible/index.ts) ---
const CROSS_REF_LOADERS: Record<string, () => Promise<CrossRefBookJson>> = Object.fromEntries(
  BIBLE_BOOKS.map((b) => [
    b.slug,
    () =>
      import(`@/data/bible/cross-references/${b.slug}.json`).then(
        (m) => m.default as CrossRefBookJson,
      ),
  ]),
)

/** Parse a ref string "bookSlug.chapter.verse" into components */
export function parseRef(ref: string): { book: string; chapter: number; verse: number } {
  // Split from the right: last segment = verse, second-to-last = chapter, rest = book slug
  const lastDot = ref.lastIndexOf('.')
  const secondLastDot = ref.lastIndexOf('.', lastDot - 1)
  return {
    book: ref.slice(0, secondLastDot),
    chapter: parseInt(ref.slice(secondLastDot + 1, lastDot), 10),
    verse: parseInt(ref.slice(lastDot + 1), 10),
  }
}

/** Load cross-references for a book. Returns cached map if available. */
export async function loadCrossRefsForBook(bookSlug: string): Promise<CrossRefMap> {
  const cached = cache.get(bookSlug)
  if (cached) return cached

  const existing = inflight.get(bookSlug)
  if (existing) return existing

  const loader = CROSS_REF_LOADERS[bookSlug]
  if (!loader) {
    const empty: CrossRefMap = new Map()
    cache.set(bookSlug, empty)
    return empty
  }

  const promise = loader()
    .then((data) => {
      const map: CrossRefMap = new Map()
      for (const [key, entries] of Object.entries(data.entries)) {
        map.set(
          key,
          entries.map((e) => ({
            ref: e.ref,
            rank: e.rank,
            parsed: parseRef(e.ref),
          })),
        )
      }
      cache.set(bookSlug, map)
      inflight.delete(bookSlug)
      return map
    })
    .catch(() => {
      const empty: CrossRefMap = new Map()
      cache.set(bookSlug, empty)
      inflight.delete(bookSlug)
      return empty
    })

  inflight.set(bookSlug, promise)
  return promise
}

/** Get cross-refs for a specific verse (sync — requires map from loadCrossRefsForBook) */
export function getCrossRefsForVerse(
  map: CrossRefMap,
  chapter: number,
  verse: number,
): CrossRef[] {
  return map.get(`${chapter}.${verse}`) ?? []
}

/** Get count of cross-refs for a verse (sync) */
export function getCrossRefCountForVerse(
  map: CrossRefMap,
  chapter: number,
  verse: number,
): number {
  return (map.get(`${chapter}.${verse}`) ?? []).length
}

/** Check if a book's cross-refs are already cached (sync) */
export function isBookCached(bookSlug: string): boolean {
  return cache.has(bookSlug)
}

/** Get cached map for a book (sync, returns null if not cached) */
export function getCachedBook(bookSlug: string): CrossRefMap | null {
  return cache.get(bookSlug) ?? null
}

/**
 * Get deduplicated cross-ref count for a verse range (multi-verse selection).
 * Deduplicates by destination ref string across all verses in the range.
 */
export function getDeduplicatedCrossRefCount(
  map: CrossRefMap,
  chapter: number,
  startVerse: number,
  endVerse: number,
): number {
  if (startVerse === endVerse) {
    return getCrossRefCountForVerse(map, chapter, startVerse)
  }
  const seen = new Set<string>()
  for (let v = startVerse; v <= endVerse; v++) {
    const refs = getCrossRefsForVerse(map, chapter, v)
    for (const ref of refs) {
      seen.add(ref.ref)
    }
  }
  return seen.size
}

/**
 * Collect all cross-refs for a verse range, deduplicated, with sourceVerse tracking.
 * For duplicate destination refs, keeps the entry from the lowest source verse.
 */
export function collectCrossRefsForRange(
  map: CrossRefMap,
  chapter: number,
  startVerse: number,
  endVerse: number,
): CrossRef[] {
  const seen = new Map<string, CrossRef>()
  for (let v = startVerse; v <= endVerse; v++) {
    const refs = getCrossRefsForVerse(map, chapter, v)
    for (const ref of refs) {
      if (!seen.has(ref.ref)) {
        seen.set(ref.ref, { ...ref, sourceVerse: v })
      }
    }
  }
  return Array.from(seen.values())
}

/** Reset cache — test-only */
export function _resetCacheForTesting(): void {
  cache.clear()
  inflight.clear()
}
