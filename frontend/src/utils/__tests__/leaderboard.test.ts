import { describe, it, expect, vi, afterEach } from 'vitest';
import { getWeeklyPoints, sortByWeeklyPoints, sortByTotalPoints } from '../leaderboard';
import type { DailyActivityLog } from '@/types/dashboard';

afterEach(() => {
  vi.useRealTimers();
});

const makeDay = (pointsEarned: number) => ({
  mood: true,
  pray: false,
  listen: false,
  prayerWall: false,
  meditate: false,
  journal: false,
  pointsEarned,
  multiplier: 1,
});

describe('getWeeklyPoints', () => {
  it('returns sum of points for current week only', () => {
    vi.useFakeTimers();
    // Wednesday March 18, 2026 — week started Monday March 16
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0));

    const activities: DailyActivityLog = {
      '2026-03-16': makeDay(20),
      '2026-03-17': makeDay(30),
      '2026-03-18': makeDay(10),
    };

    expect(getWeeklyPoints(activities)).toBe(60);
  });

  it('returns 0 when no activities exist', () => {
    expect(getWeeklyPoints({})).toBe(0);
  });

  it('excludes last week activities', () => {
    vi.useFakeTimers();
    // Monday March 16, 2026
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));

    const activities: DailyActivityLog = {
      '2026-03-15': makeDay(50), // Sunday — last week
      '2026-03-14': makeDay(40), // Saturday — last week
      '2026-03-16': makeDay(10), // Monday — this week
    };

    expect(getWeeklyPoints(activities)).toBe(10);
  });
});

describe('sortByWeeklyPoints', () => {
  it('sorts descending by weekly points', () => {
    const items = [
      { weeklyPoints: 50, faithPoints: 100 },
      { weeklyPoints: 150, faithPoints: 200 },
      { weeklyPoints: 80, faithPoints: 300 },
    ];
    const sorted = sortByWeeklyPoints(items);
    expect(sorted.map((i) => i.weeklyPoints)).toEqual([150, 80, 50]);
  });

  it('breaks ties with total points (faithPoints)', () => {
    const items = [
      { weeklyPoints: 100, faithPoints: 200 },
      { weeklyPoints: 100, faithPoints: 500 },
      { weeklyPoints: 100, faithPoints: 300 },
    ];
    const sorted = sortByWeeklyPoints(items);
    expect(sorted.map((i) => i.faithPoints)).toEqual([500, 300, 200]);
  });

  it('uses totalPoints if faithPoints not present', () => {
    const items = [
      { weeklyPoints: 100, totalPoints: 200 },
      { weeklyPoints: 100, totalPoints: 500 },
    ];
    const sorted = sortByWeeklyPoints(items);
    expect(sorted.map((i) => i.totalPoints)).toEqual([500, 200]);
  });

  it('does not mutate the original array', () => {
    const items = [
      { weeklyPoints: 50, faithPoints: 100 },
      { weeklyPoints: 150, faithPoints: 200 },
    ];
    const original = [...items];
    sortByWeeklyPoints(items);
    expect(items).toEqual(original);
  });
});

describe('sortByTotalPoints', () => {
  it('sorts descending by total points', () => {
    const items = [
      { faithPoints: 100, weeklyPoints: 50 },
      { faithPoints: 500, weeklyPoints: 20 },
      { faithPoints: 300, weeklyPoints: 80 },
    ];
    const sorted = sortByTotalPoints(items);
    expect(sorted.map((i) => i.faithPoints)).toEqual([500, 300, 100]);
  });

  it('breaks ties with weekly points', () => {
    const items = [
      { faithPoints: 300, weeklyPoints: 50 },
      { faithPoints: 300, weeklyPoints: 150 },
      { faithPoints: 300, weeklyPoints: 80 },
    ];
    const sorted = sortByTotalPoints(items);
    expect(sorted.map((i) => i.weeklyPoints)).toEqual([150, 80, 50]);
  });
});
