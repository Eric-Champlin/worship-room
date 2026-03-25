import type { ActivityType } from '@/types/dashboard';

export const ACTIVITY_POINTS: Record<ActivityType, number> = {
  mood: 5,
  pray: 10,
  listen: 10,
  prayerWall: 15,
  readingPlan: 15,
  meditate: 20,
  journal: 25,
  gratitude: 5,
  reflection: 10,
  challenge: 20,
  localVisit: 10,
  devotional: 10,
} as const;

export const ACTIVITY_DISPLAY_NAMES: Record<ActivityType, string> = {
  mood: 'Logged mood',
  pray: 'Prayed',
  listen: 'Listened',
  prayerWall: 'Prayer Wall',
  readingPlan: 'Reading Plan',
  meditate: 'Meditated',
  journal: 'Journaled',
  gratitude: 'Gave thanks',
  reflection: 'Evening reflection',
  challenge: 'Challenge',
  localVisit: 'Visited local support',
  devotional: 'Read devotional',
} as const;

export const MULTIPLIER_TIERS = [
  { minActivities: 7, multiplier: 2, label: 'Full Worship Day' },
  { minActivities: 4, multiplier: 1.5, label: 'Devoted' },
  { minActivities: 2, multiplier: 1.25, label: 'Growing' },
  { minActivities: 0, multiplier: 1, label: '' },
] as const;

export const MAX_DAILY_BASE_POINTS = 155; // 5+10+10+15+15+20+25+5+10+20+10+10
export const MAX_DAILY_POINTS = 310; // 155 × 2x

export const ACTIVITY_CHECKLIST_NAMES: Record<ActivityType, string> = {
  mood: 'Log your mood',
  pray: 'Pray',
  listen: 'Listen to worship',
  prayerWall: 'Pray for someone',
  readingPlan: 'Complete a reading',
  meditate: 'Meditate',
  journal: 'Journal',
  gratitude: 'Give thanks',
  reflection: 'Evening reflection',
  challenge: 'Challenge',
  localVisit: 'Visit local support',
  devotional: 'Read devotional',
} as const;

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'readingPlan', 'meditate', 'journal', 'gratitude', 'reflection', 'challenge', 'localVisit', 'devotional',
];
