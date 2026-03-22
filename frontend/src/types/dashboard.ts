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
  timeOfDay?: 'morning' | 'evening';
}

export type ActivityType = 'mood' | 'pray' | 'listen' | 'prayerWall' | 'meditate' | 'journal' | 'readingPlan' | 'gratitude' | 'reflection';

export interface DailyActivities {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  meditate: boolean;
  journal: boolean;
  readingPlan: boolean;
  gratitude: boolean;
  reflection: boolean;
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
  readingPlan: number;
  gratitude: number;
  reflection: number;
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

// Friends types (Spec 9)

export interface FriendProfile {
  id: string;
  displayName: string;
  avatar: string;
  level: number;
  levelName: string;
  currentStreak: number;
  faithPoints: number;
  weeklyPoints: number;
  lastActive: string;
}

export interface FriendRequest {
  id: string;
  from: FriendProfile;
  to: FriendProfile;
  sentAt: string;
  message?: string;
}

export interface FriendsData {
  friends: FriendProfile[];
  pendingIncoming: FriendRequest[];
  pendingOutgoing: FriendRequest[];
  blocked: string[];
}

// Leaderboard types (Spec 10)

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  weeklyPoints: number;
  totalPoints: number;
  level: number;
  levelName: string;
  badgeCount: number;
}

// Social Interactions types (Spec 11)

export type MilestoneEventType = 'streak_milestone' | 'level_up' | 'badge_earned' | 'points_milestone';

export interface MilestoneEvent {
  id: string;
  type: MilestoneEventType;
  userId: string;
  displayName: string;
  avatar: string;
  detail: string;
  timestamp: string;
}

export interface Encouragement {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: string;
}

export interface Nudge {
  id: string;
  fromUserId: string;
  toUserId: string;
  timestamp: string;
}

export interface SocialInteractionsData {
  encouragements: Encouragement[];
  nudges: Nudge[];
  recapDismissals: string[];
}

// Streak Repair types (Streak Repair & Grace spec)

export interface StreakRepairData {
  previousStreak: number | null;
  lastFreeRepairDate: string | null;
  repairsUsedThisWeek: number;
  weekStartDate: string;
}

export type NotificationType =
  | 'encouragement'
  | 'friend_request'
  | 'milestone'
  | 'friend_milestone'
  | 'nudge'
  | 'weekly_recap'
  | 'level_up'
  | 'monthly_report';

export interface NotificationEntry {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  actionData?: {
    friendRequestId?: string;
    badgeName?: string;
    [key: string]: unknown;
  };
}

// Getting Started Checklist types (Onboarding Spec 3)

export interface GettingStartedData {
  mood_done: boolean;
  pray_done: boolean;
  journal_done: boolean;
  meditate_done: boolean;
  ambient_visited: boolean;
  prayer_wall_visited: boolean;
}
