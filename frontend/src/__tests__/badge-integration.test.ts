import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFaithPoints } from '@/hooks/useFaithPoints';
import type { ActivityType, BadgeData } from '@/types/dashboard';

function simulateLogin() {
  localStorage.setItem('wr_auth_simulated', 'true');
  localStorage.setItem('wr_user_name', 'TestUser');
  localStorage.setItem('wr_user_id', 'test-id-123');
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthProvider, null, children);
}

function getBadges(): BadgeData {
  return JSON.parse(localStorage.getItem('wr_badges')!);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0)); // March 16
  simulateLogin();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Badge Integration — Welcome Flow', () => {
  it('welcome flow: init badges on first auth', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // welcome + level_1 awarded
    const badges = getBadges();
    expect(badges.earned.welcome).toBeDefined();
    expect(badges.earned.welcome.earnedAt).toBeTruthy();
    expect(badges.earned.level_1).toBeDefined();
    expect(badges.earned.level_1.earnedAt).toBeTruthy();

    // Both in newlyEarned
    expect(result.current.newlyEarnedBadges).toContain('welcome');
    expect(result.current.newlyEarnedBadges).toContain('level_1');

    // Activity counts at 0
    expect(badges.activityCounts.pray).toBe(0);
    expect(badges.activityCounts.journal).toBe(0);
  });
});

describe('Badge Integration — First Activity Badges', () => {
  it('first prayer badge on first pray activity', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.clearNewlyEarnedBadges(); });

    act(() => { result.current.recordActivity('pray'); });

    const badges = getBadges();
    expect(badges.earned.first_prayer).toBeDefined();
    expect(badges.activityCounts.pray).toBe(1);
    expect(result.current.newlyEarnedBadges).toContain('first_prayer');
  });
});

describe('Badge Integration — Full Worship Day', () => {
  const ALL_TYPES: ActivityType[] = ['mood', 'pray', 'listen', 'prayerWall', 'meditate', 'journal'];

  it('full worship day on completing all 6 activities', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.clearNewlyEarnedBadges(); });

    act(() => {
      for (const type of ALL_TYPES) {
        result.current.recordActivity(type);
      }
    });

    const badges = getBadges();
    expect(badges.earned.full_worship_day).toBeDefined();
    expect(badges.earned.full_worship_day.count).toBe(1);
    expect(badges.activityCounts.fullWorshipDays).toBe(1);
  });

  it('full worship day repeatable across days', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    // Day 1 — all 6
    act(() => {
      for (const type of ALL_TYPES) {
        result.current.recordActivity(type);
      }
    });
    expect(getBadges().earned.full_worship_day.count).toBe(1);
    unmount();

    // Day 2 — all 6
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0, 0));
    const { result: r2 } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      for (const type of ALL_TYPES) {
        r2.current.recordActivity(type);
      }
    });
    expect(getBadges().earned.full_worship_day.count).toBe(2);
    expect(getBadges().activityCounts.fullWorshipDays).toBe(2);
  });
});

describe('Badge Integration — Streak Milestones', () => {
  it('streak_7 on day 7, not day 6', () => {
    // Days 1-6: record an activity each day
    for (let day = 10; day <= 15; day++) {
      vi.setSystemTime(new Date(2026, 2, day, 12, 0, 0));
      const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });
      act(() => { result.current.recordActivity('pray'); });
      unmount();
    }

    // After day 6, streak_7 should NOT exist
    let badges = getBadges();
    expect(badges.earned.streak_7).toBeUndefined();

    // Day 7
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.recordActivity('pray'); });

    badges = getBadges();
    expect(badges.earned.streak_7).toBeDefined();
  });
});

describe('Badge Integration — Level-Up', () => {
  it('level_2 badge on crossing 100 points', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 95, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 5, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.clearNewlyEarnedBadges(); });

    act(() => { result.current.recordActivity('pray'); }); // +10 → 105

    expect(result.current.currentLevel).toBe(2);
    const badges = getBadges();
    expect(badges.earned.level_2).toBeDefined();
    expect(result.current.newlyEarnedBadges).toContain('level_2');
  });
});

describe('Badge Integration — Activity Count Precision', () => {
  it('prayer_100 on exactly 100th prayer', () => {
    // Pre-seed 99 prayers
    const seedBadges: BadgeData = {
      earned: {
        welcome: { earnedAt: '2026-03-01T00:00:00Z' },
        level_1: { earnedAt: '2026-03-01T00:00:00Z' },
        first_prayer: { earnedAt: '2026-03-01T00:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: {
        pray: 99, journal: 0, meditate: 0, listen: 0,
        prayerWall: 0, readingPlan: 0, gratitude: 0, encouragementsSent: 0, fullWorshipDays: 0,
      },
    };
    localStorage.setItem('wr_badges', JSON.stringify(seedBadges));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.recordActivity('pray'); }); // 100th prayer

    const badges = getBadges();
    expect(badges.activityCounts.pray).toBe(100);
    expect(badges.earned.prayer_100).toBeDefined();
  });
});

describe('Badge Integration — Multiple Badges Single Call', () => {
  it('multiple badges in single recordActivity call', () => {
    // Pre-seed: 99 journal entries, 5 activities already done today
    const seedBadges: BadgeData = {
      earned: {
        welcome: { earnedAt: '2026-03-01T00:00:00Z' },
        level_1: { earnedAt: '2026-03-01T00:00:00Z' },
        first_journal: { earnedAt: '2026-03-01T00:00:00Z' },
        journal_50: { earnedAt: '2026-03-05T00:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: {
        pray: 10, journal: 99, meditate: 5, listen: 5,
        prayerWall: 5, readingPlan: 0, gratitude: 0, encouragementsSent: 0, fullWorshipDays: 0,
      },
    };
    localStorage.setItem('wr_badges', JSON.stringify(seedBadges));

    // Set up today with 5 activities already done
    const activities = {
      mood: true, pray: true, listen: true,
      prayerWall: true, readingPlan: false, meditate: true, journal: false,
      pointsEarned: 120, multiplier: 1.5,
    };
    localStorage.setItem('wr_daily_activities', JSON.stringify({ '2026-03-16': activities }));
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 500, currentLevel: 3, currentLevelName: 'Blooming',
      pointsToNextLevel: 1000, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.recordActivity('journal'); }); // 100th journal + full worship day

    const badges = getBadges();
    expect(badges.earned.journal_100).toBeDefined();
    expect(badges.earned.full_worship_day).toBeDefined();
  });
});

describe('Badge Integration — Error Recovery', () => {
  it('corrupted wr_badges recovery', () => {
    localStorage.setItem('wr_badges', 'invalid json {{{');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    // Should recover with fresh defaults + welcome/level_1
    const badges = getBadges();
    expect(badges.earned.welcome).toBeDefined();
    expect(badges.earned.level_1).toBeDefined();

    // Should be able to record activities normally
    act(() => { result.current.recordActivity('pray'); });
    expect(getBadges().earned.first_prayer).toBeDefined();
  });

  it('localStorage unavailable graceful degradation', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.newlyEarnedBadges).toEqual([]);
    expect(result.current.totalPoints).toBe(0);

    vi.restoreAllMocks();
  });
});

describe('Badge Integration — Persistence', () => {
  it('badge persistence across hook remount', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
      result.current.recordActivity('journal');
    });

    const earnedBefore = getBadges().earned;
    expect(earnedBefore.first_prayer).toBeDefined();
    expect(earnedBefore.first_journal).toBeDefined();
    unmount();

    // Re-mount — badges should still be there
    renderHook(() => useFaithPoints(), { wrapper });
    const earnedAfter = getBadges().earned;
    expect(earnedAfter.first_prayer).toBeDefined();
    expect(earnedAfter.first_journal).toBeDefined();
    expect(earnedAfter.welcome).toBeDefined();
  });
});

describe('Badge Integration — Community Badges', () => {
  it('community badges return empty with 0 friends', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.recordActivity('pray'); });

    const badges = getBadges();
    expect(badges.earned.first_friend).toBeUndefined();
    expect(badges.earned.friends_10).toBeUndefined();
    expect(badges.earned.encourage_10).toBeUndefined();
    expect(badges.earned.encourage_50).toBeUndefined();
  });
});

describe('Badge Integration — Idempotency', () => {
  it('activityCounts not incremented on idempotent call', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.recordActivity('pray'); });
    expect(getBadges().activityCounts.pray).toBe(1);

    // Second call — idempotent
    act(() => { result.current.recordActivity('pray'); });
    expect(getBadges().activityCounts.pray).toBe(1);
  });
});
