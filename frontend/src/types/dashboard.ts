export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}

export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal';

export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  pointsEarned: number;
  multiplier: number;
}

export interface DailyActivityLog {
  [date: string]: DailyActivities;
}

export interface FaithPointsData {
  totalPoints: number;
  currentLevel: number;
  currentLevelName: string;
  pointsToNextLevel: number;
  lastUpdated: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

// Badge types (Spec 7)

export type CelebrationTier = 'toast' | 'toast-confetti' | 'special-toast' | 'full-screen';
export type BadgeCategory = 'streak' | 'level' | 'activity' | 'community' | 'special';

export interface BadgeEarnedEntry {
  earnedAt: string;
  count?: number;
}

export interface ActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  encouragementsSent: number;
  fullWorshipDays: number;
}

export interface BadgeData {
  earned: Record<string, BadgeEarnedEntry>;
  newlyEarned: string[];
  activityCounts: ActivityCounts;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  celebrationTier: CelebrationTier;
  repeatable?: boolean;
  verse?: { text: string; reference: string };
}
