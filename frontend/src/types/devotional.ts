export interface DevotionalQuote {
  text: string
  attribution: string
}

export interface DevotionalVerse {
  number: number
  text: string
}

export interface DevotionalPassage {
  reference: string
  verses: DevotionalVerse[]
}

export type DevotionalTheme =
  | 'trust'
  | 'gratitude'
  | 'forgiveness'
  | 'identity'
  | 'anxiety-and-peace'
  | 'faithfulness'
  | 'purpose'
  | 'hope'
  | 'healing'
  | 'community'

export interface Devotional {
  id: string
  dayIndex: number
  title: string
  theme: DevotionalTheme
  quote: DevotionalQuote
  passage: DevotionalPassage
  reflection: string[]
  prayer: string
  reflectionQuestion: string
}
