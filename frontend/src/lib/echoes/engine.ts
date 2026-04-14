import { BIBLE_BOOKS } from '@/constants/bible'
import type { Highlight } from '@/types/bible'
import type { Echo, EchoKind, EchoOptions } from '@/types/echoes'
import type { ChapterVisitStore } from '@/types/heatmap'
import type { MemorizationCard } from '@/types/memorize'

import { getMatchedInterval, getRelativeLabel } from './labels'

const MS_PER_DAY = 86_400_000
const DEFAULT_LIMIT = 10

function resolveBookName(slug: string): string {
  return BIBLE_BOOKS.find((b) => b.slug === slug)?.name ?? slug
}

function makeEchoId(kind: EchoKind, book: string, chapter: number, startVerse: number, endVerse: number): string {
  return `echo:${kind}:${book}:${chapter}:${startVerse}-${endVerse}`
}

function formatReference(bookName: string, chapter: number, startVerse: number, endVerse: number): string {
  if (startVerse === 0) {
    return `${bookName} ${chapter}`
  }
  if (startVerse === endVerse) {
    return `${bookName} ${chapter}:${startVerse}`
  }
  return `${bookName} ${chapter}:${startVerse}-${endVerse}`
}

function daysSinceEpoch(epochMs: number, now: number): number {
  return Math.floor((now - epochMs) / MS_PER_DAY)
}

function scoreEcho(baseScore: number, daysSince: number, isSeen: boolean): number {
  const recencyBonus = Math.max(0, 50 - daysSince / 10)
  const freshnesspenalty = isSeen ? -50 : 0
  return baseScore + recencyBonus + freshnesspenalty
}

function generateHighlightCandidates(highlights: Highlight[], now: number, seen: Set<string>): Echo[] {
  const candidates: Echo[] = []

  for (const hl of highlights) {
    const daysSince = daysSinceEpoch(hl.createdAt, now)
    const interval = getMatchedInterval(daysSince)
    if (interval === null) continue

    const bookName = resolveBookName(hl.book)
    const id = makeEchoId('highlighted', hl.book, hl.chapter, hl.startVerse, hl.endVerse)

    candidates.push({
      id,
      kind: 'highlighted',
      book: hl.book,
      bookName,
      chapter: hl.chapter,
      startVerse: hl.startVerse,
      endVerse: hl.endVerse,
      text: '', // async-resolved by the hook
      reference: formatReference(bookName, hl.chapter, hl.startVerse, hl.endVerse),
      relativeLabel: getRelativeLabel(interval, 'highlighted'),
      occurredAt: hl.createdAt,
      score: scoreEcho(80, daysSince, seen.has(id)),
    })
  }

  return candidates
}

function generateMemorizedCandidates(cards: MemorizationCard[], now: number, seen: Set<string>): Echo[] {
  const candidates: Echo[] = []

  for (const card of cards) {
    const daysSince = daysSinceEpoch(card.createdAt, now)
    const interval = getMatchedInterval(daysSince)
    if (interval === null) continue

    const id = makeEchoId('memorized', card.book, card.chapter, card.startVerse, card.endVerse)

    candidates.push({
      id,
      kind: 'memorized',
      book: card.book,
      bookName: card.bookName,
      chapter: card.chapter,
      startVerse: card.startVerse,
      endVerse: card.endVerse,
      text: card.verseText,
      reference: card.reference,
      relativeLabel: getRelativeLabel(interval, 'memorized'),
      occurredAt: card.createdAt,
      score: scoreEcho(100, daysSince, seen.has(id)),
    })
  }

  return candidates
}

function generateReadOnThisDayCandidates(
  visits: ChapterVisitStore,
  now: number,
  seen: Set<string>,
): Echo[] {
  const candidates: Echo[] = []
  const today = new Date(now)
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()
  const todayYear = today.getFullYear()

  for (const [dateKey, entries] of Object.entries(visits)) {
    // Parse YYYY-MM-DD without Date constructor (timezone-safe)
    const parts = dateKey.split('-')
    const year = Number(parts[0])
    const month = Number(parts[1]) - 1 // 0-based
    const day = Number(parts[2])

    // Must be a different year but same month/day
    if (year === todayYear) continue
    if (month !== todayMonth || day !== todayDate) continue

    // Compute approximate epoch ms for this date
    const entryEpoch = new Date(year, month, day).getTime()
    const daysSince = daysSinceEpoch(entryEpoch, now)

    for (const entry of entries) {
      const bookName = resolveBookName(entry.book)
      const id = makeEchoId('read-on-this-day', entry.book, entry.chapter, 0, 0)

      candidates.push({
        id,
        kind: 'read-on-this-day',
        book: entry.book,
        bookName,
        chapter: entry.chapter,
        startVerse: 0,
        endVerse: 0,
        text: '',
        reference: formatReference(bookName, entry.chapter, 0, 0),
        relativeLabel: getRelativeLabel(0, 'read-on-this-day', year),
        occurredAt: entryEpoch,
        score: scoreEcho(40, daysSince, seen.has(id)),
      })
    }
  }

  return candidates
}

function applyVarietyFilter(candidates: Echo[]): Echo[] {
  const bestPerBook = new Map<string, Echo>()

  for (const echo of candidates) {
    const existing = bestPerBook.get(echo.book)
    if (!existing || echo.score > existing.score) {
      bestPerBook.set(echo.book, echo)
    }
  }

  return Array.from(bestPerBook.values())
}

/**
 * Returns scored, sorted echoes from all three data sources.
 * Pure function — no side effects, no localStorage reads.
 */
export function getEchoes(
  highlights: Highlight[],
  cards: MemorizationCard[],
  visits: ChapterVisitStore,
  options?: EchoOptions,
  seen?: Set<string>,
): Echo[] {
  const seenSet = seen ?? new Set<string>()
  const now = Date.now()

  // Generate candidates from all sources
  let candidates = [
    ...generateHighlightCandidates(highlights, now, seenSet),
    ...generateMemorizedCandidates(cards, now, seenSet),
    ...generateReadOnThisDayCandidates(visits, now, seenSet),
  ]

  // Filter by kinds if specified
  if (options?.kinds && options.kinds.length > 0) {
    const allowedKinds = new Set(options.kinds)
    candidates = candidates.filter((c) => allowedKinds.has(c.kind))
  }

  // Variety filter: one per book
  candidates = applyVarietyFilter(candidates)

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  // Apply limit
  const limit = options?.limit ?? DEFAULT_LIMIT
  return candidates.slice(0, limit)
}

/**
 * Convenience wrapper: returns the top echo or null.
 */
export function getEchoForHomePage(
  highlights: Highlight[],
  cards: MemorizationCard[],
  visits: ChapterVisitStore,
  seen?: Set<string>,
): Echo | null {
  const results = getEchoes(highlights, cards, visits, { limit: 1 }, seen)
  return results[0] ?? null
}
