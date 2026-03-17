import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFaithPoints } from '@/hooks/useFaithPoints';
import { freshDailyActivities } from '@/services/faith-points-storage';
import type { ActivityType } from '@/types/dashboard';

function simulateLogin() {
  localStorage.setItem('wr_auth_simulated', 'true');
  localStorage.setItem('wr_user_name', 'TestUser');
  localStorage.setItem('wr_user_id', 'test-id-123');
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthProvider, null, children);
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

describe('Faith Points Integration — Full Day Simulation', () => {
  it('full 6-activity day = 170 points, 2x multiplier', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    const activities: ActivityType[] = ['mood', 'pray', 'listen', 'prayerWall', 'meditate', 'journal'];

    act(() => {
      for (const activity of activities) {
        result.current.recordActivity(activity);
      }
    });

    expect(result.current.todayPoints).toBe(170);
    expect(result.current.todayMultiplier).toBe(2);
    expect(result.current.totalPoints).toBe(170);
    expect(result.current.currentStreak).toBe(1);

    // All activities should be true
    for (const activity of activities) {
      expect(result.current.todayActivities[activity]).toBe(true);
    }
  });
});

describe('Faith Points Integration — Multi-Day Streak', () => {
  it('3 consecutive days increment streak to 3, gap resets to 1', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    // Day 1 — March 16
    act(() => { result.current.recordActivity('pray'); });
    expect(result.current.currentStreak).toBe(1);
    unmount();

    // Day 2 — March 17
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0, 0));
    const { result: r2, unmount: u2 } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { r2.current.recordActivity('pray'); });
    expect(r2.current.currentStreak).toBe(2);
    u2();

    // Day 3 — March 18
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0));
    const { result: r3, unmount: u3 } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { r3.current.recordActivity('pray'); });
    expect(r3.current.currentStreak).toBe(3);
    expect(r3.current.longestStreak).toBe(3);
    u3();

    // Day 5 — March 20 (skipped Day 4)
    vi.setSystemTime(new Date(2026, 2, 20, 12, 0, 0));
    const { result: r5 } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { r5.current.recordActivity('pray'); });
    expect(r5.current.currentStreak).toBe(1); // Reset
    expect(r5.current.longestStreak).toBe(3); // Preserved
  });
});

describe('Faith Points Integration — Level-Up Progression', () => {
  it('level-up from Seedling to Sprout at 100 points', () => {
    // Pre-seed 95 points
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 95, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 5, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentLevel).toBe(1);

    act(() => { result.current.recordActivity('pray'); }); // +10 → 105
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.levelName).toBe('Sprout');
  });

  it('level-up from Sprout to Blooming at 500 points', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 495, currentLevel: 2, currentLevelName: 'Sprout',
      pointsToNextLevel: 5, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.recordActivity('pray'); }); // +10 → 505
    expect(result.current.currentLevel).toBe(3);
    expect(result.current.levelName).toBe('Blooming');
  });
});

describe('Faith Points Integration — Point Recalculation', () => {
  it('point recalculation on multiplier tier change (1x→1.25x)', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // Activity 1: mood(5) × 1x = 5
    act(() => { result.current.recordActivity('mood'); });
    expect(result.current.totalPoints).toBe(5);
    expect(result.current.todayPoints).toBe(5);

    // Activity 2: mood(5) + pray(10) = 15 × 1.25 = 19; diff = 14
    act(() => { result.current.recordActivity('pray'); });
    expect(result.current.totalPoints).toBe(19);
    expect(result.current.todayPoints).toBe(19);
    expect(result.current.todayMultiplier).toBe(1.25);
  });
});

describe('Faith Points Integration — Idempotency', () => {
  it('reload preserves state, no double-count', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
      result.current.recordActivity('journal');
    });

    const totalAfter = result.current.totalPoints;
    expect(result.current.todayActivities.pray).toBe(true);
    expect(result.current.todayActivities.journal).toBe(true);

    unmount();

    // Remount (simulates page reload)
    const { result: r2 } = renderHook(() => useFaithPoints(), { wrapper });

    expect(r2.current.totalPoints).toBe(totalAfter);
    expect(r2.current.todayActivities.pray).toBe(true);
    expect(r2.current.todayActivities.journal).toBe(true);

    // Recording again should be idempotent
    act(() => {
      r2.current.recordActivity('pray');
    });
    expect(r2.current.totalPoints).toBe(totalAfter);
  });
});

describe('Faith Points Integration — Error Recovery', () => {
  it('corrupted localStorage: all 3 keys invalid JSON', () => {
    localStorage.setItem('wr_daily_activities', 'not json');
    localStorage.setItem('wr_faith_points', '{broken}');
    localStorage.setItem('wr_streak', '<<invalid>>');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    expect(result.current.totalPoints).toBe(0);
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.currentLevel).toBe(1);

    // Should still be able to record activities
    act(() => { result.current.recordActivity('pray'); });
    expect(result.current.totalPoints).toBe(10);
  });

  it('localStorage unavailable: setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // recordActivity should not crash
    act(() => { result.current.recordActivity('pray'); });

    // State should not change (persist failed)
    expect(result.current.totalPoints).toBe(0);

    vi.restoreAllMocks();
  });
});

describe('Faith Points Integration — Max Level', () => {
  it('Lighthouse: points continue accumulating beyond 10000', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 10050, currentLevel: 6, currentLevelName: 'Lighthouse',
      pointsToNextLevel: 0, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    expect(result.current.currentLevel).toBe(6);
    expect(result.current.levelName).toBe('Lighthouse');
    expect(result.current.pointsToNextLevel).toBe(0);

    act(() => { result.current.recordActivity('pray'); }); // +10
    expect(result.current.totalPoints).toBe(10060);
    expect(result.current.currentLevel).toBe(6); // Still Lighthouse
    expect(result.current.pointsToNextLevel).toBe(0);
  });
});

describe('Faith Points Integration — Midnight Rollover', () => {
  it('11:59pm activity + 12:01am activity = 2 separate days', () => {
    // Activity at 11:59 PM on March 16
    vi.setSystemTime(new Date(2026, 2, 16, 23, 59, 0));
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.recordActivity('pray'); });
    expect(result.current.currentStreak).toBe(1);
    const day1Points = result.current.todayPoints;
    unmount();

    // Activity at 12:01 AM on March 17
    vi.setSystemTime(new Date(2026, 2, 17, 0, 1, 0));
    const { result: r2 } = renderHook(() => useFaithPoints(), { wrapper });

    // Today's activities should be fresh (new day)
    expect(r2.current.todayActivities.pray).toBe(false);
    expect(r2.current.todayPoints).toBe(0);

    act(() => { r2.current.recordActivity('journal'); });
    expect(r2.current.currentStreak).toBe(2); // Consecutive
    expect(r2.current.todayActivities.journal).toBe(true);

    // Total should include both days
    expect(r2.current.totalPoints).toBe(day1Points + r2.current.todayPoints);
  });
});
