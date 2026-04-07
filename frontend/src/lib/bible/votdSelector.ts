import type { VotdEntry } from '@/types/bible-landing'
import votdData from '@/data/bible/votd.json'

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getTodaysBibleVotd(date: Date = new Date()): VotdEntry {
  const dayOfYear = getDayOfYear(date) // 1-366
  const index = (dayOfYear - 1) % 366 // 0-365
  return votdData[index] as VotdEntry
}
