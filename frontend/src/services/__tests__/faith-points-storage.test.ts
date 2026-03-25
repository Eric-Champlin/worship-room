import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getActivityLog,
  getTodayActivities,
  getFaithPoints,
  getStreakData,
  calculateDailyPoints,
  updateStreak,
  persistAll,
  freshDailyActivities,
  freshFaithPoints,
  freshStreakData,
} from '../faith-points-storage';
import type { DailyActivities, StreakData } from '@/types/dashboard';

function makeActivities(overrides: Partial<DailyActivities> = {}): DailyActivities {
  return { ...freshDailyActivities(), ...overrides };
}

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// --- getActivityLog ---

describe('getActivityLog', () => {
  it('returns {} for missing key', () => {
    expect(getActivityLog()).toEqual({});
  });

  it('returns {} for corrupted JSON', () => {
    localStorage.setItem('wr_daily_activities', '{not valid!!!');
    expect(getActivityLog()).toEqual({});
  });

  it('returns {} for non-object JSON (array)', () => {
    localStorage.setItem('wr_daily_activities', '[]');
    expect(getActivityLog()).toEqual({});
  });

  it('returns {} for non-object JSON (string)', () => {
    localStorage.setItem('wr_daily_activities', '"hello"');
    expect(getActivityLog()).toEqual({});
  });

  it('returns parsed data for valid JSON', () => {
    const data = { '2026-03-16': freshDailyActivities() };
    localStorage.setItem('wr_daily_activities', JSON.stringify(data));
    expect(getActivityLog()).toEqual(data);
  });
});

// --- getTodayActivities ---

describe('getTodayActivities', () => {
  it('returns fresh defaults when no data', () => {
    const result = getTodayActivities();
    expect(result).toEqual(freshDailyActivities());
  });

  it('returns correct entry for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const todayEntry = makeActivities({ mood: true, pointsEarned: 5, multiplier: 1 });
    const data = { '2026-03-16': todayEntry };
    localStorage.setItem('wr_daily_activities', JSON.stringify(data));

    expect(getTodayActivities()).toEqual(todayEntry);
  });

  it('returns defaults when today has no entry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const data = { '2026-03-15': makeActivities({ mood: true }) };
    localStorage.setItem('wr_daily_activities', JSON.stringify(data));

    expect(getTodayActivities()).toEqual(freshDailyActivities());
  });
});

// --- getFaithPoints ---

describe('getFaithPoints', () => {
  it('returns defaults for missing key', () => {
    const result = getFaithPoints();
    expect(result.totalPoints).toBe(0);
    expect(result.currentLevel).toBe(1);
    expect(result.currentLevelName).toBe('Seedling');
    expect(result.pointsToNextLevel).toBe(100);
  });

  it('returns defaults for corrupted JSON', () => {
    localStorage.setItem('wr_faith_points', 'not json');
    const result = getFaithPoints();
    expect(result.totalPoints).toBe(0);
  });

  it('returns defaults for invalid shape (missing totalPoints)', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({ foo: 'bar' }));
    const result = getFaithPoints();
    expect(result.totalPoints).toBe(0);
  });

  it('returns parsed data for valid JSON', () => {
    const data = {
      totalPoints: 250,
      currentLevel: 2,
      currentLevelName: 'Sprout',
      pointsToNextLevel: 250,
      lastUpdated: '2026-03-16T00:00:00.000Z',
    };
    localStorage.setItem('wr_faith_points', JSON.stringify(data));
    expect(getFaithPoints()).toEqual(data);
  });
});

// --- getStreakData ---

describe('getStreakData', () => {
  it('returns defaults for missing key', () => {
    expect(getStreakData()).toEqual(freshStreakData());
  });

  it('returns defaults for corrupted JSON', () => {
    localStorage.setItem('wr_streak', '{{bad');
    expect(getStreakData()).toEqual(freshStreakData());
  });

  it('returns defaults for invalid shape', () => {
    localStorage.setItem('wr_streak', JSON.stringify({ random: true }));
    expect(getStreakData()).toEqual(freshStreakData());
  });

  it('returns parsed data for valid JSON', () => {
    const data: StreakData = { currentStreak: 5, longestStreak: 10, lastActiveDate: '2026-03-16' };
    localStorage.setItem('wr_streak', JSON.stringify(data));
    expect(getStreakData()).toEqual(data);
  });
});

// --- calculateDailyPoints ---

describe('calculateDailyPoints', () => {
  it('0 activities = 0 points, 1x multiplier', () => {
    const result = calculateDailyPoints(freshDailyActivities());
    expect(result).toEqual({ points: 0, multiplier: 1 });
  });

  it('1 activity (mood=5) = 5 points, 1x', () => {
    const result = calculateDailyPoints(makeActivities({ mood: true }));
    expect(result).toEqual({ points: 5, multiplier: 1 });
  });

  it('2 activities = base × 1.25x', () => {
    // mood(5) + pray(10) = 15 base × 1.25 = 18.75 → 19
    const result = calculateDailyPoints(makeActivities({ mood: true, pray: true }));
    expect(result).toEqual({ points: 19, multiplier: 1.25 });
  });

  it('3 activities = base × 1.25x', () => {
    // mood(5) + pray(10) + listen(10) = 25 base × 1.25 = 31.25 → 31
    const result = calculateDailyPoints(makeActivities({ mood: true, pray: true, listen: true }));
    expect(result).toEqual({ points: 31, multiplier: 1.25 });
  });

  it('4 activities = base × 1.5x', () => {
    // mood(5) + pray(10) + listen(10) + prayerWall(15) = 40 base × 1.5 = 60
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true,
    }));
    expect(result).toEqual({ points: 60, multiplier: 1.5 });
  });

  it('5 activities = base × 1.5x', () => {
    // mood(5) + pray(10) + listen(10) + prayerWall(15) + meditate(20) = 60 base × 1.5 = 90
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, meditate: true,
    }));
    expect(result).toEqual({ points: 90, multiplier: 1.5 });
  });

  it('6 activities = base × 1.5x', () => {
    // mood(5) + pray(10) + listen(10) + prayerWall(15) + meditate(20) + journal(25) = 85 base × 1.5 = 127.5 → 128
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, meditate: true, journal: true,
    }));
    expect(result).toEqual({ points: 128, multiplier: 1.5 });
  });

  it('7 activities = base × 2x (Full Worship Day)', () => {
    // mood(5) + pray(10) + listen(10) + prayerWall(15) + meditate(20) + journal(25) + gratitude(5) = 90 × 2 = 180
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, meditate: true, journal: true, gratitude: true,
    }));
    expect(result).toEqual({ points: 180, multiplier: 2 });
  });

  it('8 activities = 105 × 2x = 210 (all activities except reflection)', () => {
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, readingPlan: true, meditate: true, journal: true, gratitude: true,
    }));
    expect(result).toEqual({ points: 210, multiplier: 2 });
  });

  it('9 activities = 115 × 2x = 230 (all original activities including reflection)', () => {
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, readingPlan: true, meditate: true, journal: true, gratitude: true, reflection: true,
    }));
    expect(result).toEqual({ points: 230, multiplier: 2 });
  });

  it('10 activities = 135 × 2x = 270 (all activities including challenge)', () => {
    const result = calculateDailyPoints(makeActivities({
      mood: true, pray: true, listen: true, prayerWall: true, readingPlan: true, meditate: true, journal: true, gratitude: true, reflection: true, challenge: true,
    }));
    expect(result).toEqual({ points: 270, multiplier: 2 });
  });

  it('challenge counts toward multiplier tier', () => {
    // mood(5) + challenge(20) = 25 base, 2 activities → 1.25x = 31.25 → rounds to 31
    const result = calculateDailyPoints(makeActivities({ mood: true, challenge: true }));
    expect(result.multiplier).toBe(1.25);
    expect(result.points).toBe(Math.round(25 * 1.25));
  });

  it('verify rounding (Math.round)', () => {
    // mood(5) + pray(10) = 15 × 1.25 = 18.75 → rounds to 19
    const result = calculateDailyPoints(makeActivities({ mood: true, pray: true }));
    expect(result.points).toBe(19);
    expect(result.points).toBe(Math.round(15 * 1.25));
  });
});

// --- updateStreak ---

describe('updateStreak', () => {
  it('first-ever (null lastActiveDate) → streak 1', () => {
    const result = updateStreak('2026-03-16', freshStreakData());
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1, lastActiveDate: '2026-03-16' });
  });

  it('same day (lastActiveDate=today) → no change', () => {
    const current: StreakData = { currentStreak: 3, longestStreak: 5, lastActiveDate: '2026-03-16' };
    const result = updateStreak('2026-03-16', current);
    expect(result).toEqual(current);
  });

  it('consecutive day (lastActiveDate=yesterday) → increment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0)); // March 16

    const current: StreakData = { currentStreak: 3, longestStreak: 5, lastActiveDate: '2026-03-15' };
    const result = updateStreak('2026-03-16', current);
    expect(result).toEqual({ currentStreak: 4, longestStreak: 5, lastActiveDate: '2026-03-16' });
  });

  it('missed day(s) (lastActiveDate=2 days ago) → reset to 1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const current: StreakData = { currentStreak: 5, longestStreak: 10, lastActiveDate: '2026-03-14' };
    const result = updateStreak('2026-03-16', current);
    expect(result).toEqual({ currentStreak: 1, longestStreak: 10, lastActiveDate: '2026-03-16' });
  });

  it('multi-day gap (active Monday, return Thursday) → reset to 1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 19, 12, 0, 0)); // Thursday March 19

    const current: StreakData = { currentStreak: 7, longestStreak: 7, lastActiveDate: '2026-03-16' }; // Monday
    const result = updateStreak('2026-03-19', current);
    expect(result).toEqual({ currentStreak: 1, longestStreak: 7, lastActiveDate: '2026-03-19' });
  });

  it('longest streak updates on increment', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const current: StreakData = { currentStreak: 5, longestStreak: 5, lastActiveDate: '2026-03-15' };
    const result = updateStreak('2026-03-16', current);
    expect(result.longestStreak).toBe(6);
    expect(result.currentStreak).toBe(6);
  });

  it('longest streak preserved after reset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const current: StreakData = { currentStreak: 3, longestStreak: 15, lastActiveDate: '2026-03-10' };
    const result = updateStreak('2026-03-16', current);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(15);
  });
});

// --- persistAll ---

describe('persistAll', () => {
  it('writes all 3 keys', () => {
    const log = { '2026-03-16': freshDailyActivities() };
    const points = freshFaithPoints();
    const streak = freshStreakData();

    const result = persistAll(log, points, streak);
    expect(result).toBe(true);

    expect(JSON.parse(localStorage.getItem('wr_daily_activities')!)).toEqual(log);
    expect(JSON.parse(localStorage.getItem('wr_faith_points')!)).toEqual(points);
    expect(JSON.parse(localStorage.getItem('wr_streak')!)).toEqual(streak);
  });

  it('returns false if localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const result = persistAll({}, freshFaithPoints(), freshStreakData());
    expect(result).toBe(false);

    vi.restoreAllMocks();
  });
});

// --- freshDailyActivities ---

describe('freshDailyActivities', () => {
  it('includes reflection: false', () => {
    const fresh = freshDailyActivities();
    expect(fresh.reflection).toBe(false);
  });

  it('has all 12 activity boolean fields', () => {
    const fresh = freshDailyActivities();
    const boolKeys = Object.entries(fresh)
      .filter(([_, v]) => typeof v === 'boolean')
      .map(([k]) => k);
    expect(boolKeys).toHaveLength(12);
    expect(boolKeys).toContain('reflection');
    expect(boolKeys).toContain('challenge');
    expect(boolKeys).toContain('localVisit');
    expect(boolKeys).toContain('devotional');
  });

  it('has localVisit: false by default', () => {
    const fresh = freshDailyActivities();
    expect(fresh.localVisit).toBe(false);
  });
});
