import type { Highlight, Bookmark, Note, JournalEntry } from './bible'
import type { PersonalPrayer } from './personal-prayer'
import type { MeditationSession } from './meditation'

export const CURRENT_SCHEMA_VERSION = 1
export const APP_VERSION = 'worship-room-bible-wave-1'

export interface BibleExportV1 {
  schemaVersion: 1
  exportedAt: string // ISO 8601
  appVersion: string
  data: {
    highlights: Highlight[]
    bookmarks: Bookmark[]
    notes: Note[]
    prayers: PersonalPrayer[]
    journals: JournalEntry[]
    meditations: MeditationSession[]
  }
}

export interface MergeResult {
  added: number
  updated: number
  skipped: number
}

export interface ImportResult {
  mode: 'replace' | 'merge'
  totalItems: number
  highlights: MergeResult
  bookmarks: MergeResult
  notes: MergeResult
  prayers: MergeResult
  journals: MergeResult
  meditations: MergeResult
}
