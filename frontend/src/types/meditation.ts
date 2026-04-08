import type { MeditationType } from './daily-experience'

export interface MeditationVerseContext {
  book: string
  chapter: number
  startVerse: number
  endVerse: number
  reference: string
}

export interface MeditationSession {
  id: string
  type: MeditationType
  date: string // YYYY-MM-DD
  durationMinutes: number // whole minutes, min 1
  completedAt: string // ISO 8601
  verseContext?: MeditationVerseContext
}
