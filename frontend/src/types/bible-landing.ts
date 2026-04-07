/** Stored in wr_bible_last_read by BB-4 (Reader spec) */
export interface LastRead {
  book: string // BIBLE_BOOKS name, e.g. "John"
  chapter: number // 1-indexed
  verse: number // 1-indexed, last viewed verse
  timestamp: number // epoch ms (Date.now())
}

/** Stored in wr_bible_active_plans by BB-21 (Plans spec) */
export interface ActivePlan {
  planId: string
  currentDay: number
  totalDays: number
  planName: string
  todayReading: string // e.g. "John 3:1-21"
  startedAt: number // epoch ms
}

/** Stored in wr_bible_streak by BB-17 (Streak spec) */
export interface BibleStreak {
  count: number
  lastReadDate: string // ISO date string, e.g. "2026-04-07"
}

/** Single entry in votd.json */
export interface VotdEntry {
  reference: string // e.g. "Psalm 23:1"
  book: string // BIBLE_BOOKS name, e.g. "Psalms"
  chapter: number
  verse: number
  text: string // WEB translation text
}
