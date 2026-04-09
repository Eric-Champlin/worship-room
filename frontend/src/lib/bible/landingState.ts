import { getStreak } from '@/lib/bible/streakStore'
import type { LastRead, ActivePlan, BibleStreak } from '@/types/bible-landing'

export function getLastRead(): LastRead | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('wr_bible_last_read')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.book || !parsed.chapter || !parsed.timestamp) return null
    return parsed as LastRead
  } catch {
    return null
  }
}

export function getActivePlans(): ActivePlan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('wr_bible_active_plans')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getBibleStreak(): BibleStreak | null {
  const record = getStreak()
  if (record.currentStreak <= 0) return null
  return { count: record.currentStreak, lastReadDate: record.lastReadDate }
}
