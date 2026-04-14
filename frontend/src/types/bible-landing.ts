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

/** Theme categories for Verse of the Day entries */
export type VotdTheme =
  | 'love' | 'hope' | 'peace' | 'strength' | 'faith' | 'joy'
  | 'comfort' | 'wisdom' | 'forgiveness' | 'provision' | 'praise' | 'presence'

/** Single entry in votd-list.json (no text — text loaded from WEB JSON) */
export interface VotdListEntry {
  ref: string           // human-readable reference, e.g. "John 3:16"
  book: string          // lowercase slug, e.g. "john"
  chapter: number
  startVerse: number
  endVerse: number      // equals startVerse for single-verse entries
  theme: VotdTheme
}

/** Hydrated VOTD entry with verse text (returned by useVerseOfTheDay) */
export interface VotdHydrated {
  entry: VotdListEntry
  verseText: string     // assembled text from WEB JSON, or fallback
  bookName: string      // display name from BIBLE_BOOKS, e.g. "John"
  wordCount: number     // for long-verse font size decision
}
