import type { BadgeDefinition, BadgeData, ActivityCounts, CelebrationTier } from '@/types/dashboard';

// --- Thresholds ---

export const STREAK_THRESHOLDS: number[] = [7, 14, 30, 60, 90, 180, 365];

export const ACTIVITY_MILESTONE_THRESHOLDS: Record<string, number[]> = {
  pray: [1, 100],
  journal: [1, 50, 100],
  meditate: [1, 25],
  listen: [1, 50],
  prayerWall: [1],
};

export const COMMUNITY_BADGE_THRESHOLDS = {
  friends: [1, 10],
  encouragements: [10, 50],
};

// --- Level-Up Verses (WEB translation) ---

export const LEVEL_UP_VERSES: Record<number, { text: string; reference: string }> = {
  1: {
    text: 'For we are his workmanship, created in Christ Jesus for good works.',
    reference: 'Ephesians 2:10',
  },
  2: {
    text: 'I planted, Apollos watered, but God gave the increase.',
    reference: '1 Corinthians 3:6',
  },
  3: {
    text: 'The righteous shall flourish like the palm tree. He will grow like a cedar in Lebanon.',
    reference: 'Psalm 92:12',
  },
  4: {
    text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith.',
    reference: 'Galatians 5:22',
  },
  5: {
    text: 'He will be like a tree planted by the streams of water, that produces its fruit in its season.',
    reference: 'Psalm 1:3',
  },
  6: {
    text: 'You are the light of the world. A city located on a hill can\'t be hidden.',
    reference: 'Matthew 5:14',
  },
};

// --- Badge Definitions ---

const STREAK_TIERS: Record<number, CelebrationTier> = {
  7: 'toast',
  14: 'toast',
  30: 'toast',
  60: 'full-screen',
  90: 'full-screen',
  180: 'full-screen',
  365: 'full-screen',
};

const STREAK_NAMES: Record<number, { name: string; description: string }> = {
  7: { name: 'First Flame', description: 'Maintained a 7-day streak' },
  14: { name: 'Steady Flame', description: 'Maintained a 14-day streak' },
  30: { name: 'Burning Bright', description: 'Maintained a 30-day streak' },
  60: { name: 'Unwavering', description: 'Maintained a 60-day streak' },
  90: { name: 'Faithful', description: 'Maintained a 90-day streak' },
  180: { name: 'Half-Year Warrior', description: 'Maintained a 180-day streak' },
  365: { name: 'Year of Faith', description: 'Maintained a 365-day streak' },
};

const LEVEL_NAMES: Record<number, { name: string; description: string }> = {
  1: { name: 'Seedling', description: 'Reached Level 1' },
  2: { name: 'Sprout', description: 'Reached Level 2' },
  3: { name: 'Blooming', description: 'Reached Level 3' },
  4: { name: 'Flourishing', description: 'Reached Level 4' },
  5: { name: 'Oak', description: 'Reached Level 5' },
  6: { name: 'Lighthouse', description: 'Reached Level 6' },
};

const streakBadges: BadgeDefinition[] = STREAK_THRESHOLDS.map((threshold) => ({
  id: `streak_${threshold}`,
  name: STREAK_NAMES[threshold].name,
  description: STREAK_NAMES[threshold].description,
  category: 'streak',
  celebrationTier: STREAK_TIERS[threshold],
}));

const levelBadges: BadgeDefinition[] = [1, 2, 3, 4, 5, 6].map((level) => ({
  id: `level_${level}`,
  name: LEVEL_NAMES[level].name,
  description: LEVEL_NAMES[level].description,
  category: 'level',
  celebrationTier: 'full-screen' as CelebrationTier,
  verse: LEVEL_UP_VERSES[level],
}));

const activityMilestoneBadges: BadgeDefinition[] = [
  { id: 'first_prayer', name: 'First Prayer', description: '1st prayer generated', category: 'activity', celebrationTier: 'toast' },
  { id: 'prayer_100', name: 'Prayer Warrior', description: '100th prayer', category: 'activity', celebrationTier: 'toast-confetti' },
  { id: 'first_journal', name: 'First Entry', description: '1st journal entry saved', category: 'activity', celebrationTier: 'toast' },
  { id: 'journal_50', name: 'Faithful Scribe', description: '50th journal entry', category: 'activity', celebrationTier: 'toast-confetti' },
  { id: 'journal_100', name: 'Devoted Writer', description: '100th journal entry', category: 'activity', celebrationTier: 'toast-confetti' },
  { id: 'first_meditate', name: 'First Meditation', description: '1st meditation completed', category: 'activity', celebrationTier: 'toast' },
  { id: 'meditate_25', name: 'Mindful', description: '25th meditation', category: 'activity', celebrationTier: 'toast-confetti' },
  { id: 'first_listen', name: 'First Listen', description: '1st audio session', category: 'activity', celebrationTier: 'toast' },
  { id: 'listen_50', name: 'Worship in Song', description: '50th listen session', category: 'activity', celebrationTier: 'toast-confetti' },
];

const fullWorshipDayBadge: BadgeDefinition = {
  id: 'full_worship_day',
  name: 'Full Worship Day',
  description: 'All daily activities completed in a single day',
  category: 'special',
  celebrationTier: 'special-toast',
  repeatable: true,
};

const readingPlanBadges: BadgeDefinition[] = [
  {
    id: 'first_plan',
    name: 'First Plan',
    description: 'Completed your first reading plan',
    category: 'activity',
    celebrationTier: 'toast-confetti',
  },
  {
    id: 'plans_3',
    name: 'Dedicated Reader',
    description: 'Completed 3 reading plans',
    category: 'activity',
    celebrationTier: 'toast-confetti',
  },
  {
    id: 'plans_10',
    name: 'Scripture Scholar',
    description: 'Completed all 10 reading plans',
    category: 'activity',
    celebrationTier: 'full-screen',
    verse: {
      text: 'Your word is a lamp to my feet, and a light for my path.',
      reference: 'Psalm 119:105 WEB',
    },
  },
];

const communityBadges: BadgeDefinition[] = [
  { id: 'first_prayerwall', name: 'First Prayer Wall', description: '1st prayer wall post or reaction', category: 'activity', celebrationTier: 'toast' },
  { id: 'first_friend', name: 'First Friend', description: '1st mutual friend added', category: 'community', celebrationTier: 'toast' },
  { id: 'friends_10', name: 'Inner Circle', description: '10 mutual friends', category: 'community', celebrationTier: 'toast-confetti' },
  { id: 'encourage_10', name: 'Encourager', description: '10 encouragements sent', category: 'community', celebrationTier: 'toast' },
  { id: 'encourage_50', name: 'Cheerleader', description: '50 encouragements sent', category: 'community', celebrationTier: 'toast-confetti' },
];

const welcomeBadge: BadgeDefinition = {
  id: 'welcome',
  name: 'Welcome to Worship Room',
  description: 'Joined the Worship Room community',
  category: 'special',
  celebrationTier: 'toast',
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...streakBadges,
  ...levelBadges,
  ...activityMilestoneBadges,
  ...readingPlanBadges,
  fullWorshipDayBadge,
  ...communityBadges,
  welcomeBadge,
];

export const BADGE_MAP: Record<string, BadgeDefinition> = Object.fromEntries(
  BADGE_DEFINITIONS.map((badge) => [badge.id, badge]),
);

// --- Default / Fresh State ---

export const FRESH_ACTIVITY_COUNTS: ActivityCounts = {
  pray: 0,
  journal: 0,
  meditate: 0,
  listen: 0,
  prayerWall: 0,
  readingPlan: 0,
  gratitude: 0,
  encouragementsSent: 0,
  fullWorshipDays: 0,
};

export const FRESH_BADGE_DATA: BadgeData = {
  earned: {},
  newlyEarned: [],
  activityCounts: { ...FRESH_ACTIVITY_COUNTS },
};
