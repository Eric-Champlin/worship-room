import type { ActivityCounts, BadgeEarnedEntry, DailyActivities, StreakData } from '@/types/dashboard';
import {
  STREAK_THRESHOLDS,
  ACTIVITY_MILESTONE_THRESHOLDS,
  COMMUNITY_BADGE_THRESHOLDS,
} from '@/constants/dashboard/badges';

export interface BadgeCheckContext {
  streak: StreakData;
  level: number;
  previousLevel: number;
  todayActivities: DailyActivities;
  activityCounts: ActivityCounts;
  friendCount: number;
  allActivitiesWereTrueBefore: boolean;
}

const ACTIVITY_BADGE_MAP: Record<string, Record<number, string>> = {
  pray: { 1: 'first_prayer', 100: 'prayer_100' },
  journal: { 1: 'first_journal', 50: 'journal_50', 100: 'journal_100' },
  meditate: { 1: 'first_meditate', 25: 'meditate_25' },
  listen: { 1: 'first_listen', 50: 'listen_50' },
  prayerWall: { 1: 'first_prayerwall' },
};

const FRIEND_BADGE_MAP: Record<number, string> = {
  1: 'first_friend',
  10: 'friends_10',
};

const ENCOURAGE_BADGE_MAP: Record<number, string> = {
  10: 'encourage_10',
  50: 'encourage_50',
};

export function checkForNewBadges(
  context: BadgeCheckContext,
  earned: Record<string, BadgeEarnedEntry>,
): string[] {
  const result: string[] = [];

  // 1. Streak badges
  for (const threshold of STREAK_THRESHOLDS) {
    const badgeId = `streak_${threshold}`;
    if (context.streak.currentStreak >= threshold && !earned[badgeId]) {
      result.push(badgeId);
    }
  }

  // 2. Level badges
  const levelBadgeId = `level_${context.level}`;
  if (!earned[levelBadgeId]) {
    result.push(levelBadgeId);
  }

  // 3. Activity milestones
  for (const [activityKey, thresholds] of Object.entries(ACTIVITY_MILESTONE_THRESHOLDS)) {
    const count = context.activityCounts[activityKey as keyof ActivityCounts];
    if (typeof count !== 'number') continue;
    for (const threshold of thresholds) {
      const badgeId = ACTIVITY_BADGE_MAP[activityKey]?.[threshold];
      if (badgeId && count >= threshold && !earned[badgeId]) {
        result.push(badgeId);
      }
    }
  }

  // 4. Full Worship Day
  const allTrue =
    context.todayActivities.mood &&
    context.todayActivities.pray &&
    context.todayActivities.listen &&
    context.todayActivities.prayerWall &&
    context.todayActivities.meditate &&
    context.todayActivities.journal;

  if (allTrue && !context.allActivitiesWereTrueBefore) {
    result.push('full_worship_day');
  }

  // 5. Community badges
  for (const threshold of COMMUNITY_BADGE_THRESHOLDS.friends) {
    const badgeId = FRIEND_BADGE_MAP[threshold];
    if (badgeId && context.friendCount >= threshold && !earned[badgeId]) {
      result.push(badgeId);
    }
  }

  for (const threshold of COMMUNITY_BADGE_THRESHOLDS.encouragements) {
    const badgeId = ENCOURAGE_BADGE_MAP[threshold];
    if (badgeId && context.activityCounts.encouragementsSent >= threshold && !earned[badgeId]) {
      result.push(badgeId);
    }
  }

  return result;
}
