import type { Highlight, Bookmark, Note, JournalEntry } from './bible'
import type { PlansStoreState } from './bible-plans'
import type { PersonalPrayer } from './personal-prayer'
import type { MeditationSession } from './meditation'

export const CURRENT_SCHEMA_VERSION = 2
export const APP_VERSION = 'worship-room-bible-wave-2'

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

export interface BibleExportV2 {
  schemaVersion: 2
  exportedAt: string
  appVersion: string
  data: BibleExportV1['data'] & {
    plans?: PlansStoreState
  }
}

// Union type for import parsing
export type BibleExport = BibleExportV1 | BibleExportV2

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
  plans?: MergeResult
}
