import type { HighlightColor } from '@/types/bible'
import type { MeditationType } from '@/types/daily-experience'

export type ActivityItemType = 'highlight' | 'bookmark' | 'note' | 'meditation'

export interface HighlightData {
  type: 'highlight'
  color: HighlightColor
}

export interface BookmarkData {
  type: 'bookmark'
  label?: string
}

export interface NoteData {
  type: 'note'
  body: string
}

export interface MeditationData {
  type: 'meditation'
  meditationType: MeditationType
  durationMinutes: number
  reference: string
}

export type ActivityItemData = HighlightData | BookmarkData | NoteData | MeditationData

export interface ActivityItem {
  type: ActivityItemType
  id: string
  createdAt: number
  updatedAt: number
  book: string
  bookName: string
  chapter: number
  startVerse: number
  endVerse: number
  data: ActivityItemData
}

export interface ActivityFilter {
  type: 'all' | 'highlights' | 'notes' | 'bookmarks' | 'daily-hub'
  book: string
  color: HighlightColor | 'all'
}

export type ActivitySort = 'recent' | 'canonical'
