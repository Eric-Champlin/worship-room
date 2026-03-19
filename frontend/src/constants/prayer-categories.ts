export const PRAYER_CATEGORIES = [
  'health', 'family', 'work', 'grief',
  'gratitude', 'praise', 'relationships', 'other',
] as const

export type PrayerCategory = (typeof PRAYER_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<PrayerCategory, string> = {
  health: 'Health',
  family: 'Family',
  work: 'Work',
  grief: 'Grief',
  gratitude: 'Gratitude',
  praise: 'Praise',
  relationships: 'Relationships',
  other: 'Other',
}

export function isValidCategory(value: string | null): value is PrayerCategory {
  return value !== null && PRAYER_CATEGORIES.includes(value as PrayerCategory)
}
