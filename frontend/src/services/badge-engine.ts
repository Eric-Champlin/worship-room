import type { ActivityCounts, BadgeEarnedEntry, DailyActivities, StreakData } from '@/types/dashboard';
import {
  STREAK_THRESHOLDS,
  ACTIVITY_MILESTONE_THRESHOLDS,
  COMMUNITY_BADGE_THRESHOLDS,
} from '@/constants/dashboard/badges';
import { getUniqueVisitedPlaces } from '@/services/local-visit-storage';
import { BIBLE_BOOKS } from '@/constants/bible';
import { getMeditationHistory } from '@/services/meditation-storage';
import { getGratitudeEntries } from '@/services/gratitude-storage';

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
  const baseAllTrue =
    context.todayActivities.mood &&
    context.todayActivities.pray &&
    context.todayActivities.listen &&
    context.todayActivities.prayerWall &&
    context.todayActivities.meditate &&
    context.todayActivities.journal;

  // If user has an active reading plan, Full Worship Day requires readingPlan too
  let hasActivePlan = false;
  try {
    const progressJson = localStorage.getItem('wr_reading_plan_progress');
    if (progressJson) {
      const progressMap = JSON.parse(progressJson) as Record<string, { completedAt: string | null }>;
      hasActivePlan = Object.values(progressMap).some(p => p.completedAt == null);
    }
  } catch { /* ignore */ }

  const allTrue = hasActivePlan
    ? baseAllTrue && context.todayActivities.readingPlan
    : baseAllTrue;

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

  // 6. Reading plan completion badges
  const READING_PLAN_BADGES: Record<number, string> = {
    1: 'first_plan',
    3: 'plans_3',
    10: 'plans_10',
  };

  try {
    const progressJson = localStorage.getItem('wr_reading_plan_progress');
    if (progressJson) {
      const progressMap = JSON.parse(progressJson) as Record<string, { completedAt: string | null }>;
      const completedCount = Object.values(progressMap).filter(p => p.completedAt != null).length;
      for (const [threshold, badgeId] of Object.entries(READING_PLAN_BADGES)) {
        if (completedCount >= Number(threshold) && !earned[badgeId]) {
          result.push(badgeId);
        }
      }
    }
  } catch {
    // Malformed localStorage — skip reading plan badge check
  }

  // 7. Local Support Seeker badge
  const LOCAL_SUPPORT_BADGE_ID = 'local_support_5';
  if (!earned[LOCAL_SUPPORT_BADGE_ID]) {
    try {
      const { total } = getUniqueVisitedPlaces();
      if (total >= 5) {
        result.push(LOCAL_SUPPORT_BADGE_ID);
      }
    } catch {
      // Malformed localStorage — skip local support badge check
    }
  }

  // 8. Bible book completion badges
  const BIBLE_BOOK_BADGES: Record<number, string> = {
    1: 'bible_book_1',
    5: 'bible_book_5',
    10: 'bible_book_10',
    66: 'bible_book_66',
  };

  try {
    const progressJson = localStorage.getItem('wr_bible_progress');
    if (progressJson) {
      const progressMap = JSON.parse(progressJson) as Record<string, number[]>;
      let completedBooks = 0;
      for (const book of BIBLE_BOOKS) {
        const chapters = progressMap[book.slug] ?? [];
        if (chapters.length >= book.chapters) {
          completedBooks++;
        }
      }
      for (const [threshold, badgeId] of Object.entries(BIBLE_BOOK_BADGES)) {
        if (completedBooks >= Number(threshold) && !earned[badgeId]) {
          result.push(badgeId);
        }
      }
    }
  } catch {
    // Malformed localStorage — skip Bible book badge check
  }

  // 9. Meditation session milestones (from wr_meditation_history)
  const MEDITATION_SESSION_BADGES: Record<number, string> = {
    10: 'meditate_10',
    50: 'meditate_50',
    100: 'meditate_100',
  };

  try {
    const sessions = getMeditationHistory();
    const sessionCount = sessions.length;
    for (const [threshold, badgeId] of Object.entries(MEDITATION_SESSION_BADGES)) {
      if (sessionCount >= Number(threshold) && !earned[badgeId]) {
        result.push(badgeId);
      }
    }
  } catch {
    // Malformed localStorage — skip meditation session badge check
  }

  // 10. Prayer Wall post milestones (from activityCounts.prayerWallPosts)
  const PRAYER_POST_BADGES: Record<number, string> = {
    1: 'prayerwall_first_post',
    10: 'prayerwall_10_posts',
  };

  for (const [threshold, badgeId] of Object.entries(PRAYER_POST_BADGES)) {
    if (context.activityCounts.prayerWallPosts >= Number(threshold) && !earned[badgeId]) {
      result.push(badgeId);
    }
  }

  // 11. Intercessor badge (from activityCounts.intercessionCount)
  if (context.activityCounts.intercessionCount >= 25 && !earned['prayerwall_25_intercessions']) {
    result.push('prayerwall_25_intercessions');
  }

  // 12. Bible chapter milestones (from wr_bible_progress, total chapters across all books)
  const BIBLE_CHAPTER_BADGES: Record<number, string> = {
    1: 'bible_first_chapter',
    10: 'bible_10_chapters',
    25: 'bible_25_chapters',
  };

  try {
    const progressJson = localStorage.getItem('wr_bible_progress');
    if (progressJson) {
      const progressMap = JSON.parse(progressJson) as Record<string, number[]>;
      let totalChapters = 0;
      for (const chapters of Object.values(progressMap)) {
        if (Array.isArray(chapters)) {
          totalChapters += chapters.length;
        }
      }
      for (const [threshold, badgeId] of Object.entries(BIBLE_CHAPTER_BADGES)) {
        if (totalChapters >= Number(threshold) && !earned[badgeId]) {
          result.push(badgeId);
        }
      }
    }
  } catch {
    // Malformed localStorage — skip Bible chapter badge check
  }

  // 13. Gratitude milestones (from wr_gratitude_entries)
  try {
    const entries = getGratitudeEntries();
    const uniqueDates = new Set(entries.map(e => e.date));
    const totalDays = uniqueDates.size;

    // Total days badges
    const GRATITUDE_TOTAL_BADGES: Record<number, string> = {
      30: 'gratitude_30_days',
      100: 'gratitude_100_days',
    };
    for (const [threshold, badgeId] of Object.entries(GRATITUDE_TOTAL_BADGES)) {
      if (totalDays >= Number(threshold) && !earned[badgeId]) {
        result.push(badgeId);
      }
    }

    // Consecutive streak badge (7 days)
    if (!earned['gratitude_7_streak'] && totalDays >= 7) {
      const sortedDates = Array.from(uniqueDates).sort();
      let maxConsecutive = 1;
      let currentConsecutive = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1] + 'T12:00:00');
        const curr = new Date(sortedDates[i] + 'T12:00:00');
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }
      if (maxConsecutive >= 7) {
        result.push('gratitude_7_streak');
      }
    }
  } catch {
    // Malformed localStorage — skip gratitude badge check
  }

  // 14. Local support first visit (from wr_local_visits)
  if (!earned['local_first_visit']) {
    try {
      const { total } = getUniqueVisitedPlaces();
      if (total >= 1) {
        result.push('local_first_visit');
      }
    } catch {
      // Malformed localStorage — skip local first visit badge check
    }
  }

  // 15. Worship Listener (from wr_listening_history, 10 hours = 36000 seconds)
  if (!earned['listen_10_hours']) {
    try {
      const historyJson = localStorage.getItem('wr_listening_history');
      if (historyJson) {
        const sessions = JSON.parse(historyJson) as Array<{ durationSeconds?: number }>;
        const totalSeconds = sessions.reduce(
          (sum, s) => sum + (typeof s.durationSeconds === 'number' ? s.durationSeconds : 0),
          0,
        );
        if (totalSeconds >= 36000) {
          result.push('listen_10_hours');
        }
      }
    } catch {
      // Malformed localStorage — skip listening badge check
    }
  }

  return result;
}
