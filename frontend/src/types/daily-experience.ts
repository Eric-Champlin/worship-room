export interface DailyVerse {
  id: string
  reference: string
  text: string
  theme: string
}

export interface DailySong {
  id: string
  trackId: string
  title: string
  artist: string
}

export interface MockPrayer {
  id: string
  topic: string
  text: string
}

export interface ClassicPrayer {
  id: string
  title: string
  attribution: string
  text: string
}

export interface JournalPrompt {
  id: string
  theme: string
  text: string
}

export interface JournalReflection {
  id: string
  text: string
}

export interface GratitudeAffirmation {
  template: string
}

export interface PsalmInfo {
  id: string
  number: number
  title: string
  description: string
  intro: string
  verses: string[]
}

export interface Psalm119Section {
  id: string
  hebrewLetter: string
  verseRange: string
  startVerse: number
  endVerse: number
  verses: string[]
}

export interface ACTSStep {
  id: string
  title: string
  prompt: string
  verse: DailyVerse
}

export interface ExamenStep {
  id: string
  title: string
  prompt: string
}

export type MeditationType =
  | 'breathing'
  | 'soaking'
  | 'gratitude'
  | 'acts'
  | 'psalm'
  | 'examen'
  | 'bible-audio'

export interface DailyCompletion {
  date: string
  pray: boolean
  journal: boolean
  meditate: {
    completed: boolean
    types: MeditationType[]
  }
}

export type JournalMode = 'guided' | 'free'

export interface SavedJournalEntry {
  id: string
  content: string
  timestamp: string
  mode: JournalMode
  promptText?: string
  reflection?: string
}

export interface PrayContext {
  from: 'pray'
  topic: string
}
