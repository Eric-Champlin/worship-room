import type { PrayerCategory } from '@/constants/prayer-categories'

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
}

export type PrayerListFilter = 'all' | 'active' | 'answered'
