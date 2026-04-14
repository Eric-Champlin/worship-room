import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerVerseContext } from '@/types/daily-experience'

export interface PersonalPrayer {
  id: string
  title: string
  description: string
  category: PrayerCategory
  status: 'active' | 'answered'
  createdAt: string
  updatedAt: string
  answeredAt: string | null
  answeredNote: string | null
  lastPrayedAt: string | null
  reminderEnabled?: boolean
  reminderTime?: string
  sourceType?: 'prayer_wall'
  sourceId?: string
  verseContext?: PrayerVerseContext
}

export type PrayerListFilter = 'all' | 'active' | 'answered'
