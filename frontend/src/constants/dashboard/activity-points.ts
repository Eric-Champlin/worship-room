import type { ActivityType } from '@/types/dashboard';

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  meditate: 20,
  journal: 25,
} as const;

export const ACTIVITY_DISPLAY_NAMES: Record<ActivityType, string> = {
  mood: 'Logged mood',
  pray: 'Prayed',
  listen: 'Listened',
  prayerWall: 'Prayer Wall',
  meditate: 'Meditated',
  journal: 'Journaled',
} as const;

export const MULTIPLIER_TIERS = [
  { minActivities: 6, multiplier: 2, label: 'Full Worship Day' },
  { minActivities: 4, multiplier: 1.5, label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1, label: '' },
] as const;

export const MAX_DAILY_BASE_POINTS = 85; // 5+10+10+15+20+25
export const MAX_DAILY_POINTS = 170; // 85 × 2x

export const ACTIVITY_CHECKLIST_NAMES: Record<ActivityType, string> = {
  mood: 'Log your mood',
  pray: 'Pray',
  listen: 'Listen to worship',
  prayerWall: 'Pray for someone',
  meditate: 'Meditate',
  journal: 'Journal',
} as const;

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'meditate', 'journal',
];
