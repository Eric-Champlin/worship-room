import type { BadgeData, ActivityCounts, ActivityType } from '@/types/dashboard';
import { FRESH_BADGE_DATA, FRESH_ACTIVITY_COUNTS, BADGE_MAP } from '@/constants/dashboard/badges';

const BADGES_KEY = 'wr_badges';
const FRIENDS_KEY = 'wr_friends';

const ACTIVITY_TYPE_TO_COUNT_KEY: Partial<Record<ActivityType, keyof ActivityCounts>> = {
  pray: 'pray',
  journal: 'journal',
  meditate: 'meditate',
  listen: 'listen',
  prayerWall: 'prayerWall',
  readingPlan: 'readingPlan',
  // mood has no counter
};

function isValidActivityCounts(obj: unknown): obj is Partial<ActivityCounts> {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

function fillActivityCounts(partial: Partial<ActivityCounts>): ActivityCounts {
  return {
    pray: typeof partial.pray === 'number' ? partial.pray : 0,
    journal: typeof partial.journal === 'number' ? partial.journal : 0,
    meditate: typeof partial.meditate === 'number' ? partial.meditate : 0,
    listen: typeof partial.listen === 'number' ? partial.listen : 0,
    prayerWall: typeof partial.prayerWall === 'number' ? partial.prayerWall : 0,
    readingPlan: typeof partial.readingPlan === 'number' ? partial.readingPlan : 0,
    encouragementsSent: typeof partial.encouragementsSent === 'number' ? partial.encouragementsSent : 0,
    fullWorshipDays: typeof partial.fullWorshipDays === 'number' ? partial.fullWorshipDays : 0,
  };
}

export function getBadgeData(): BadgeData {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) return { ...FRESH_BADGE_DATA, activityCounts: { ...FRESH_ACTIVITY_COUNTS } };

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...FRESH_BADGE_DATA, activityCounts: { ...FRESH_ACTIVITY_COUNTS } };
    }

    const earned = parsed.earned;
    if (typeof earned !== 'object' || earned === null || Array.isArray(earned)) {
      return { ...FRESH_BADGE_DATA, activityCounts: { ...FRESH_ACTIVITY_COUNTS } };
    }

    const newlyEarned = Array.isArray(parsed.newlyEarned) ? parsed.newlyEarned : [];
    const activityCounts = isValidActivityCounts(parsed.activityCounts)
      ? fillActivityCounts(parsed.activityCounts)
      : { ...FRESH_ACTIVITY_COUNTS };

    return { earned, newlyEarned, activityCounts };
  } catch {
    return { ...FRESH_BADGE_DATA, activityCounts: { ...FRESH_ACTIVITY_COUNTS } };
  }
}

export function saveBadgeData(data: BadgeData): boolean {
  try {
    localStorage.setItem(BADGES_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function initializeBadgesForNewUser(): BadgeData {
  const now = new Date().toISOString();

  const data: BadgeData = {
    earned: {
      welcome: { earnedAt: now },
      level_1: { earnedAt: now },
    },
    newlyEarned: ['welcome', 'level_1'],
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
  };

  saveBadgeData(data);
  return data;
}

export function getOrInitBadgeData(isAuthenticated: boolean): BadgeData {
  if (!isAuthenticated) {
    return { ...FRESH_BADGE_DATA, activityCounts: { ...FRESH_ACTIVITY_COUNTS } };
  }

  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) {
      return initializeBadgesForNewUser();
    }
    // Validate the stored data is parseable and has the right shape
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
      typeof parsed.earned !== 'object' || parsed.earned === null || Array.isArray(parsed.earned)
    ) {
      // Corrupted data — reinitialize
      return initializeBadgesForNewUser();
    }
  } catch {
    // Invalid JSON or localStorage error — reinitialize
    return initializeBadgesForNewUser();
  }

  return getBadgeData();
}

export function addEarnedBadge(data: BadgeData, badgeId: string): BadgeData {
  const now = new Date().toISOString();
  const definition = BADGE_MAP[badgeId];
  const isRepeatable = definition?.repeatable === true;
  const existing = data.earned[badgeId];

  // Non-repeatable badge already earned — skip
  if (existing && !isRepeatable) {
    return data;
  }

  // Build new earned entry
  let newEntry;
  if (isRepeatable) {
    const prevCount = existing?.count ?? 0;
    newEntry = { earnedAt: now, count: prevCount + 1 };
  } else {
    newEntry = { earnedAt: now };
  }

  // Avoid duplicate in newlyEarned
  const newlyEarned = data.newlyEarned.includes(badgeId)
    ? [...data.newlyEarned]
    : [...data.newlyEarned, badgeId];

  return {
    ...data,
    earned: { ...data.earned, [badgeId]: newEntry },
    newlyEarned,
  };
}

export function incrementActivityCount(data: BadgeData, type: ActivityType): BadgeData {
  const countKey = ACTIVITY_TYPE_TO_COUNT_KEY[type];
  if (!countKey) {
    // mood has no counter
    return data;
  }

  return {
    ...data,
    activityCounts: {
      ...data.activityCounts,
      [countKey]: data.activityCounts[countKey] + 1,
    },
  };
}

export function clearNewlyEarned(data: BadgeData): BadgeData {
  return { ...data, newlyEarned: [] };
}

export function getFriendCount(): number {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.friends)) return 0;
    return parsed.friends.length;
  } catch {
    return 0;
  }
}
