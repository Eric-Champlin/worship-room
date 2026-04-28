import type { DailyActivityLog, DailyActivities, FaithPointsData, StreakData, ActivityType } from '@/types/dashboard';
import { getLocalDateString, getYesterdayDateString } from '@/utils/date';
import { ACTIVITY_POINTS, MULTIPLIER_TIERS } from '@/constants/dashboard/activity-points';

const ACTIVITIES_KEY = 'wr_daily_activities';
const POINTS_KEY = 'wr_faith_points';
const STREAK_KEY = 'wr_streak';

const ACTIVITY_BOOLEAN_KEYS: ActivityType[] = [
  'mood', 'pray', 'listen', 'prayerWall', 'readingPlan', 'meditate', 'journal', 'gratitude', 'reflection', 'challenge', 'localVisit', 'devotional', 'intercession',
];

export function freshDailyActivities(): DailyActivities {
  return {
    mood: false, pray: false, listen: false,
    prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false,
    challenge: false,
    localVisit: false,
    devotional: false,
    intercession: false,
    pointsEarned: 0, multiplier: 1,
  };
}

export function freshFaithPoints(): FaithPointsData {
  return {
    totalPoints: 0, currentLevel: 1,
    currentLevelName: 'Seedling', pointsToNextLevel: 100,
    lastUpdated: new Date().toISOString(),
  };
}

export function freshStreakData(): StreakData {
  return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
}

export function getActivityLog(): DailyActivityLog {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return {};
  }
}

export function getTodayActivities(): DailyActivities {
  const log = getActivityLog();
  const today = getLocalDateString();
  const entry = log[today];
  if (entry && typeof entry === 'object' && 'mood' in entry) {
    return entry;
  }
  return freshDailyActivities();
}

export function getFaithPoints(): FaithPointsData {
  try {
    const raw = localStorage.getItem(POINTS_KEY);
    if (!raw) return freshFaithPoints();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.totalPoints !== 'number') {
      return freshFaithPoints();
    }
    return parsed;
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return freshFaithPoints();
  }
}

export function getStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return freshStreakData();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.currentStreak !== 'number') {
      return freshStreakData();
    }
    return parsed;
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return freshStreakData();
  }
}

export function calculateDailyPoints(activities: DailyActivities): { points: number; multiplier: number } {
  let basePoints = 0;
  let activityCount = 0;

  for (const key of ACTIVITY_BOOLEAN_KEYS) {
    if (activities[key]) {
      basePoints += ACTIVITY_POINTS[key];
      activityCount++;
    }
  }

  let multiplier = 1;
  for (const tier of MULTIPLIER_TIERS) {
    if (activityCount >= tier.minActivities) {
      multiplier = tier.multiplier;
      break;
    }
  }

  return { points: Math.round(basePoints * multiplier), multiplier };
}

export function updateStreak(today: string, currentData: StreakData): StreakData {
  // First-ever activity
  if (currentData.lastActiveDate === null) {
    return { currentStreak: 1, longestStreak: 1, lastActiveDate: today };
  }

  // Already active today
  if (currentData.lastActiveDate === today) {
    return { ...currentData };
  }

  const yesterday = getYesterdayDateString();

  // Consecutive day
  if (currentData.lastActiveDate === yesterday) {
    const newStreak = currentData.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, currentData.longestStreak),
      lastActiveDate: today,
    };
  }

  // Missed day(s) — reset to 1
  return {
    currentStreak: 1,
    longestStreak: Math.max(1, currentData.longestStreak),
    lastActiveDate: today,
  };
}

function pruneOldEntries(log: DailyActivityLog): DailyActivityLog {
  const keys = Object.keys(log);
  if (keys.length <= 365) return log;
  keys.sort();
  const cutoff = keys[keys.length - 365];
  const pruned: DailyActivityLog = {};
  for (const key of keys) {
    if (key >= cutoff) pruned[key] = log[key];
  }
  return pruned;
}

export function persistAll(
  activityLog: DailyActivityLog,
  faithPoints: FaithPointsData,
  streak: StreakData,
): boolean {
  try {
    const pruned = pruneOldEntries(activityLog);
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(pruned));
    localStorage.setItem(POINTS_KEY, JSON.stringify(faithPoints));
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
    return true;
  } catch (_e) {
    // localStorage may be unavailable
    return false;
  }
}
