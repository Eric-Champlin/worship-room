import type { VotdListEntry } from '@/types/bible-landing'
import votdList from '@/data/bible/votd/votd-list.json'

const FALLBACK_ENTRY: VotdListEntry = {
  ref: 'John 3:16',
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  theme: 'love',
}

/** Returns 1-based day of year in local timezone. Jan 1 = 1, Dec 31 = 365 or 366. */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/** Deterministic verse selection for a given date. Same date → same verse globally. */
export function selectVotdForDate(date: Date = new Date()): VotdListEntry {
  if (!Array.isArray(votdList) || votdList.length === 0) return FALLBACK_ENTRY
  const dayOfYear = getDayOfYear(date) // 1-366
  const index = (dayOfYear - 1) % votdList.length // 0-365
  return (votdList[index] as VotdListEntry) ?? FALLBACK_ENTRY
}
