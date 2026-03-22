export type GuidedPrayerTheme =
  | 'peace'
  | 'comfort'
  | 'gratitude'
  | 'forgiveness'
  | 'strength'
  | 'healing'
  | 'morning'
  | 'evening'

export interface GuidedPrayerSegment {
  type: 'narration' | 'silence'
  text: string
  durationSeconds: number
}

export interface GuidedPrayerSession {
  id: string
  title: string
  description: string
  theme: GuidedPrayerTheme
  durationMinutes: 5 | 10 | 15
  icon: string
  completionVerse: { reference: string; text: string }
  script: GuidedPrayerSegment[]
}
