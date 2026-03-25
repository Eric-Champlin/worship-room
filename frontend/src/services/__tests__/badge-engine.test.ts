import { describe, it, expect } from 'vitest';
import { checkForNewBadges, type BadgeCheckContext } from '../badge-engine';
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges';
import type { BadgeEarnedEntry, DailyActivities } from '@/types/dashboard';
import { freshDailyActivities } from '@/services/faith-points-storage';

function makeContext(overrides: Partial<BadgeCheckContext> = {}): BadgeCheckContext {
  return {
    streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    level: 1,
    previousLevel: 1,
    todayActivities: freshDailyActivities(),
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
    friendCount: 0,
    allActivitiesWereTrueBefore: false,
    ...overrides,
  };
}

function allTrueActivities(): DailyActivities {
  return {
    mood: true, pray: true, listen: true,
    prayerWall: true, readingPlan: true, gratitude: true, meditate: true, journal: true, reflection: true,
    challenge: true, localVisit: true, devotional: true,
    pointsEarned: 270, multiplier: 2,
  };
}

describe('checkForNewBadges — streak badges', () => {
  it('streak_7 fires at streak 7', () => {
    const ctx = makeContext({ streak: { currentStreak: 7, longestStreak: 7, lastActiveDate: '2026-03-17' } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('streak_7');
  });

  it('streak_7 does NOT fire at streak 6', () => {
    const ctx = makeContext({ streak: { currentStreak: 6, longestStreak: 6, lastActiveDate: '2026-03-17' } });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('streak_7');
  });

  it('multiple streak badges fire at streak 30', () => {
    const ctx = makeContext({ streak: { currentStreak: 30, longestStreak: 30, lastActiveDate: '2026-03-17' } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('streak_7');
    expect(result).toContain('streak_14');
    expect(result).toContain('streak_30');
    expect(result).not.toContain('streak_60');
  });

  it('already-earned streak badge not returned', () => {
    const ctx = makeContext({ streak: { currentStreak: 14, longestStreak: 14, lastActiveDate: '2026-03-17' } });
    const earned: Record<string, BadgeEarnedEntry> = {
      streak_7: { earnedAt: '2026-03-10T00:00:00Z' },
    };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('streak_7');
    expect(result).toContain('streak_14');
  });
});

describe('checkForNewBadges — level badges', () => {
  it('level badge fires on level-up', () => {
    const ctx = makeContext({ level: 2, previousLevel: 1 });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('level_2');
  });

  it('level badge does NOT fire if already earned', () => {
    const ctx = makeContext({ level: 2, previousLevel: 2 });
    const earned: Record<string, BadgeEarnedEntry> = {
      level_2: { earnedAt: '2026-03-15T00:00:00Z' },
    };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('level_2');
  });
});

describe('checkForNewBadges — activity milestones', () => {
  it('first_prayer at count 1', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, pray: 1 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('first_prayer');
  });

  it('prayer_100 at count 100', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, pray: 100 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('prayer_100');
  });

  it('prayer_100 NOT at count 99', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, pray: 99 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('prayer_100');
  });

  it('journal milestones at 1, 50, 100', () => {
    const ctx1 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, journal: 1 } });
    expect(checkForNewBadges(ctx1, {})).toContain('first_journal');

    const ctx50 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, journal: 50 } });
    expect(checkForNewBadges(ctx50, {})).toContain('journal_50');

    const ctx100 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, journal: 100 } });
    expect(checkForNewBadges(ctx100, {})).toContain('journal_100');
  });

  it('meditate milestones at 1, 25', () => {
    const ctx1 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, meditate: 1 } });
    expect(checkForNewBadges(ctx1, {})).toContain('first_meditate');

    const ctx25 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, meditate: 25 } });
    expect(checkForNewBadges(ctx25, {})).toContain('meditate_25');
  });

  it('listen milestones at 1, 50', () => {
    const ctx1 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, listen: 1 } });
    expect(checkForNewBadges(ctx1, {})).toContain('first_listen');

    const ctx50 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, listen: 50 } });
    expect(checkForNewBadges(ctx50, {})).toContain('listen_50');
  });
});

describe('checkForNewBadges — full worship day', () => {
  it('full_worship_day when all 6 true', () => {
    const ctx = makeContext({ todayActivities: allTrueActivities() });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('full_worship_day');
  });

  it('full_worship_day NOT when only 5 true', () => {
    const activities = allTrueActivities();
    activities.journal = false;
    const ctx = makeContext({ todayActivities: activities });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('full_worship_day');
  });

  it('full_worship_day NOT when allActivitiesWereTrueBefore', () => {
    const ctx = makeContext({
      todayActivities: allTrueActivities(),
      allActivitiesWereTrueBefore: true,
    });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('full_worship_day');
  });

  it('full_worship_day triggers with 6 activities when no active plan', () => {
    // No wr_reading_plan_progress in localStorage
    const activities = allTrueActivities();
    activities.readingPlan = false;
    const ctx = makeContext({ todayActivities: activities });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('full_worship_day');
  });

  it('full_worship_day requires 7 activities when active plan exists', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { startedAt: '2026-01-01', completedAt: null },
    }));
    const activities = allTrueActivities();
    activities.readingPlan = false;
    const ctx = makeContext({ todayActivities: activities });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('full_worship_day');
  });

  it('full_worship_day triggers with 7 activities when active plan exists', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { startedAt: '2026-01-01', completedAt: null },
    }));
    const ctx = makeContext({ todayActivities: allTrueActivities() });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('full_worship_day');
  });
});

describe('checkForNewBadges — community badges', () => {
  it('community badges at friend thresholds', () => {
    const ctx1 = makeContext({ friendCount: 1 });
    expect(checkForNewBadges(ctx1, {})).toContain('first_friend');

    const ctx10 = makeContext({ friendCount: 10 });
    expect(checkForNewBadges(ctx10, {})).toContain('friends_10');
  });

  it('community badges at encouragement thresholds', () => {
    const ctx10 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, encouragementsSent: 10 } });
    expect(checkForNewBadges(ctx10, {})).toContain('encourage_10');

    const ctx50 = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, encouragementsSent: 50 } });
    expect(checkForNewBadges(ctx50, {})).toContain('encourage_50');
  });

  it('community badges return empty when counts are 0', () => {
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('first_friend');
    expect(result).not.toContain('friends_10');
    expect(result).not.toContain('encourage_10');
    expect(result).not.toContain('encourage_50');
  });
});

describe('checkForNewBadges — reading plan badges', () => {
  it('awards first_plan when 1 plan completed', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { startedAt: '2026-01-01', currentDay: 7, completedDays: [1, 2, 3, 4, 5, 6, 7], completedAt: '2026-01-07' },
    }));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('first_plan');
  });

  it('awards plans_3 when 3 plans completed', () => {
    const progress: Record<string, { startedAt: string; completedAt: string | null }> = {};
    for (let i = 1; i <= 3; i++) {
      progress[`plan-${i}`] = { startedAt: '2026-01-01', completedAt: '2026-01-07' };
    }
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify(progress));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('plans_3');
  });

  it('awards plans_10 when 10 plans completed', () => {
    const progress: Record<string, { startedAt: string; completedAt: string | null }> = {};
    for (let i = 1; i <= 10; i++) {
      progress[`plan-${i}`] = { startedAt: '2026-01-01', completedAt: '2026-01-07' };
    }
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify(progress));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('plans_10');
  });

  it('does not award if already earned', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { startedAt: '2026-01-01', completedAt: '2026-01-07' },
    }));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, { first_plan: { earnedAt: '2026-01-07' } });
    expect(result).not.toContain('first_plan');
  });

  it('does not award when no plans completed', () => {
    localStorage.setItem('wr_reading_plan_progress', JSON.stringify({
      'plan-1': { startedAt: '2026-01-01', completedAt: null },
    }));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('first_plan');
  });

  it('handles malformed localStorage gracefully', () => {
    localStorage.setItem('wr_reading_plan_progress', 'not valid json');
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('first_plan');
  });
});

describe('checkForNewBadges — multiple badges', () => {
  it('multiple badges in single call', () => {
    const ctx = makeContext({
      todayActivities: allTrueActivities(),
      activityCounts: { ...FRESH_ACTIVITY_COUNTS, journal: 100 },
    });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('journal_100');
    expect(result).toContain('full_worship_day');
  });
});
