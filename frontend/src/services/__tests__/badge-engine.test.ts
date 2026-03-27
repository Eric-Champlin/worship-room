import { describe, it, expect, beforeEach } from 'vitest';
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

describe('checkForNewBadges — Bible book badges', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function makeFullBook(_slug: string, chapters: number): number[] {
    return Array.from({ length: chapters }, (_, i) => i + 1);
  }

  it('awards bible_book_1 for 1 completed book', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      ruth: makeFullBook('ruth', 4),
    }));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('bible_book_1');
  });

  it('awards bible_book_5 at 5 books', () => {
    const progress: Record<string, number[]> = {};
    const shortBooks = ['ruth', 'obadiah', 'philemon', 'jude', 'jonah'];
    const chapterCounts = [4, 1, 1, 1, 4];
    for (let i = 0; i < 5; i++) {
      progress[shortBooks[i]] = makeFullBook(shortBooks[i], chapterCounts[i]);
    }
    localStorage.setItem('wr_bible_progress', JSON.stringify(progress));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('bible_book_5');
  });

  it('awards bible_book_10 at 10 books', () => {
    const progress: Record<string, number[]> = {};
    // Use 10 short books
    const books = [
      ['ruth', 4], ['obadiah', 1], ['philemon', 1], ['jude', 1], ['jonah', 4],
      ['haggai', 2], ['nahum', 3], ['habakkuk', 3], ['zephaniah', 3], ['malachi', 4],
    ] as const;
    for (const [slug, chapters] of books) {
      progress[slug] = makeFullBook(slug, chapters);
    }
    localStorage.setItem('wr_bible_progress', JSON.stringify(progress));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('bible_book_10');
  });

  it('does not re-award already earned Bible book badges', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      ruth: makeFullBook('ruth', 4),
    }));
    const ctx = makeContext();
    const earned = { bible_book_1: { earnedAt: '2026-03-20T00:00:00Z' } };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('bible_book_1');
  });

  it('does not award when no books completed', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      genesis: [1, 2, 3], // only 3 of 50
    }));
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('bible_book_1');
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

describe('checkForNewBadges — local support badge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('awards local_support_5 at 5 unique visits', () => {
    const visits = [
      { id: '1', placeId: 'a', placeName: 'A', placeType: 'church', date: '2026-03-01', note: '' },
      { id: '2', placeId: 'b', placeName: 'B', placeType: 'church', date: '2026-03-02', note: '' },
      { id: '3', placeId: 'c', placeName: 'C', placeType: 'counselor', date: '2026-03-03', note: '' },
      { id: '4', placeId: 'd', placeName: 'D', placeType: 'counselor', date: '2026-03-04', note: '' },
      { id: '5', placeId: 'e', placeName: 'E', placeType: 'cr', date: '2026-03-05', note: '' },
    ];
    localStorage.setItem('wr_local_visits', JSON.stringify(visits));

    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('local_support_5');
  });

  it('does not award at 4 unique visits', () => {
    const visits = [
      { id: '1', placeId: 'a', placeName: 'A', placeType: 'church', date: '2026-03-01', note: '' },
      { id: '2', placeId: 'b', placeName: 'B', placeType: 'church', date: '2026-03-02', note: '' },
      { id: '3', placeId: 'c', placeName: 'C', placeType: 'counselor', date: '2026-03-03', note: '' },
      { id: '4', placeId: 'd', placeName: 'D', placeType: 'counselor', date: '2026-03-04', note: '' },
    ];
    localStorage.setItem('wr_local_visits', JSON.stringify(visits));

    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('local_support_5');
  });

  it('does not re-award earned badge', () => {
    const visits = [
      { id: '1', placeId: 'a', placeName: 'A', placeType: 'church', date: '2026-03-01', note: '' },
      { id: '2', placeId: 'b', placeName: 'B', placeType: 'church', date: '2026-03-02', note: '' },
      { id: '3', placeId: 'c', placeName: 'C', placeType: 'counselor', date: '2026-03-03', note: '' },
      { id: '4', placeId: 'd', placeName: 'D', placeType: 'counselor', date: '2026-03-04', note: '' },
      { id: '5', placeId: 'e', placeName: 'E', placeType: 'cr', date: '2026-03-05', note: '' },
    ];
    localStorage.setItem('wr_local_visits', JSON.stringify(visits));

    const ctx = makeContext();
    const earned = { local_support_5: { earnedAt: '2026-03-05T00:00:00Z' } };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('local_support_5');
  });

  it('handles empty localStorage', () => {
    const ctx = makeContext();
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('local_support_5');
  });
});

// --- New badge checks (missing-badge-definitions spec) ---

describe('checkForNewBadges — meditation session badges', () => {
  beforeEach(() => { localStorage.clear(); });

  function seedSessions(count: number): void {
    const sessions = Array.from({ length: count }, (_, i) => ({
      id: `s-${i}`,
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      type: 'breathing',
      durationMinutes: 5,
    }));
    localStorage.setItem('wr_meditation_history', JSON.stringify(sessions));
  }

  it('meditate_10 fires at 10 sessions', () => {
    seedSessions(10);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('meditate_10');
  });

  it('meditate_10 does NOT fire at 9 sessions', () => {
    seedSessions(9);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('meditate_10');
  });

  it('meditate_50 fires at 50 sessions', () => {
    seedSessions(50);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('meditate_50');
  });

  it('meditate_50 does NOT fire at 49 sessions', () => {
    seedSessions(49);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('meditate_50');
  });

  it('meditate_100 fires at 100 sessions', () => {
    seedSessions(100);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('meditate_100');
  });

  it('meditate_100 does NOT fire at 99 sessions', () => {
    seedSessions(99);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('meditate_100');
  });

  it('already-earned meditation badges not re-returned', () => {
    seedSessions(100);
    const earned = {
      meditate_10: { earnedAt: '2026-03-10T00:00:00Z' },
      meditate_50: { earnedAt: '2026-03-15T00:00:00Z' },
    };
    const result = checkForNewBadges(makeContext(), earned);
    expect(result).not.toContain('meditate_10');
    expect(result).not.toContain('meditate_50');
    expect(result).toContain('meditate_100');
  });
});

describe('checkForNewBadges — prayer wall post badges', () => {
  it('prayerwall_first_post fires at prayerWallPosts: 1', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, prayerWallPosts: 1 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('prayerwall_first_post');
  });

  it('prayerwall_first_post does NOT fire at prayerWallPosts: 0', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, prayerWallPosts: 0 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('prayerwall_first_post');
  });

  it('prayerwall_10_posts fires at prayerWallPosts: 10', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, prayerWallPosts: 10 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('prayerwall_10_posts');
  });

  it('prayerwall_10_posts does NOT fire at prayerWallPosts: 9', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, prayerWallPosts: 9 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('prayerwall_10_posts');
  });

  it('already-earned post badges not re-returned', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, prayerWallPosts: 10 } });
    const earned = { prayerwall_first_post: { earnedAt: '2026-03-01T00:00:00Z' } };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('prayerwall_first_post');
    expect(result).toContain('prayerwall_10_posts');
  });
});

describe('checkForNewBadges — intercessor badge', () => {
  it('prayerwall_25_intercessions fires at intercessionCount: 25', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, intercessionCount: 25 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).toContain('prayerwall_25_intercessions');
  });

  it('prayerwall_25_intercessions does NOT fire at intercessionCount: 24', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, intercessionCount: 24 } });
    const result = checkForNewBadges(ctx, {});
    expect(result).not.toContain('prayerwall_25_intercessions');
  });

  it('already-earned not re-returned', () => {
    const ctx = makeContext({ activityCounts: { ...FRESH_ACTIVITY_COUNTS, intercessionCount: 30 } });
    const earned = { prayerwall_25_intercessions: { earnedAt: '2026-03-20T00:00:00Z' } };
    const result = checkForNewBadges(ctx, earned);
    expect(result).not.toContain('prayerwall_25_intercessions');
  });
});

describe('checkForNewBadges — Bible chapter badges', () => {
  beforeEach(() => { localStorage.clear(); });

  it('bible_first_chapter fires at 1 total chapter', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({ genesis: [1] }));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('bible_first_chapter');
  });

  it('bible_10_chapters fires at 10 total chapters across books', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      genesis: [1, 2, 3, 4, 5],
      exodus: [1, 2, 3, 4, 5],
    }));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('bible_10_chapters');
  });

  it('bible_25_chapters fires at 25 total chapters', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      genesis: Array.from({ length: 25 }, (_, i) => i + 1),
    }));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('bible_25_chapters');
  });

  it('no badge fires at 0 chapters', () => {
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('bible_first_chapter');
    expect(result).not.toContain('bible_10_chapters');
    expect(result).not.toContain('bible_25_chapters');
  });

  it('chapters spread across multiple books are summed', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({
      genesis: [1, 2],
      exodus: [1, 2, 3],
      ruth: [1, 2, 3, 4],
      jonah: [1],
    }));
    // Total: 2 + 3 + 4 + 1 = 10
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('bible_10_chapters');
  });
});

describe('checkForNewBadges — gratitude badges', () => {
  beforeEach(() => { localStorage.clear(); });

  function seedGratitude(dates: string[]): void {
    const entries = dates.map((date, i) => ({
      id: `g-${i}`,
      date,
      items: ['Thankful'],
      createdAt: `${date}T12:00:00Z`,
    }));
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries));
  }

  function consecutiveDates(count: number, startDate = '2026-01-01'): string[] {
    const dates: string[] = [];
    const start = new Date(startDate + 'T12:00:00');
    for (let i = 0; i < count; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  it('gratitude_7_streak fires with 7 consecutive dates', () => {
    seedGratitude(consecutiveDates(7));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('gratitude_7_streak');
  });

  it('gratitude_7_streak does NOT fire with 6 consecutive dates', () => {
    seedGratitude(consecutiveDates(6));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('gratitude_7_streak');
  });

  it('gratitude_7_streak does NOT fire with 7 non-consecutive dates', () => {
    // Dates with gaps — every other day
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date('2026-01-01T12:00:00');
      d.setDate(d.getDate() + i * 2); // Every other day
      return d.toISOString().split('T')[0];
    });
    seedGratitude(dates);
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('gratitude_7_streak');
  });

  it('gratitude_30_days fires at 30 unique dates', () => {
    seedGratitude(consecutiveDates(30));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('gratitude_30_days');
  });

  it('gratitude_100_days fires at 100 unique dates', () => {
    seedGratitude(consecutiveDates(100));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('gratitude_100_days');
  });
});

describe('checkForNewBadges — local first visit badge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('local_first_visit fires at 1 unique place', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'a', placeName: 'A', placeType: 'church', date: '2026-03-01', note: '' },
    ]));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('local_first_visit');
  });

  it('local_first_visit does NOT fire at 0 places', () => {
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('local_first_visit');
  });

  it('local_first_visit not re-returned if earned', () => {
    localStorage.setItem('wr_local_visits', JSON.stringify([
      { id: '1', placeId: 'a', placeName: 'A', placeType: 'church', date: '2026-03-01', note: '' },
    ]));
    const earned = { local_first_visit: { earnedAt: '2026-03-01T00:00:00Z' } };
    const result = checkForNewBadges(makeContext(), earned);
    expect(result).not.toContain('local_first_visit');
  });
});

describe('checkForNewBadges — listening badge', () => {
  beforeEach(() => { localStorage.clear(); });

  it('listen_10_hours fires at 36000 durationSeconds total', () => {
    localStorage.setItem('wr_listening_history', JSON.stringify([
      { id: '1', durationSeconds: 36000 },
    ]));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('listen_10_hours');
  });

  it('listen_10_hours does NOT fire at 35999 seconds', () => {
    localStorage.setItem('wr_listening_history', JSON.stringify([
      { id: '1', durationSeconds: 35999 },
    ]));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).not.toContain('listen_10_hours');
  });

  it('listen_10_hours sums across multiple sessions', () => {
    localStorage.setItem('wr_listening_history', JSON.stringify([
      { id: '1', durationSeconds: 20000 },
      { id: '2', durationSeconds: 16000 },
    ]));
    const result = checkForNewBadges(makeContext(), {});
    expect(result).toContain('listen_10_hours');
  });

  it('listen_10_hours not re-returned if earned', () => {
    localStorage.setItem('wr_listening_history', JSON.stringify([
      { id: '1', durationSeconds: 40000 },
    ]));
    const earned = { listen_10_hours: { earnedAt: '2026-03-15T00:00:00Z' } };
    const result = checkForNewBadges(makeContext(), earned);
    expect(result).not.toContain('listen_10_hours');
  });
});
