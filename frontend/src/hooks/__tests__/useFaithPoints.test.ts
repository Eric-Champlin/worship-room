import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFaithPoints } from '../useFaithPoints';
import { freshDailyActivities, freshFaithPoints, freshStreakData } from '@/services/faith-points-storage';
import type { MoodEntry } from '@/types/dashboard';

function makeMoodEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: 'test-mood-1',
    date: '2026-03-16',
    mood: 3,
    moodLabel: 'Okay',
    timestamp: 1742140800000,
    verseSeen: 'Psalm 46:10',
    ...overrides,
  };
}

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
  vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0)); // March 16, 2026 noon
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useFaithPoints — unauthenticated', () => {
  it('returns default values when not authenticated', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.totalPoints).toBe(0);
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.levelName).toBe('Seedling');
    expect(result.current.pointsToNextLevel).toBe(100);
    expect(result.current.todayPoints).toBe(0);
    expect(result.current.todayMultiplier).toBe(1);
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.todayActivities).toEqual({
      mood: false, pray: false, listen: false,
      prayerWall: false, meditate: false, journal: false,
    });
  });

  it('recordActivity is no-op when not authenticated', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray');
    });
    expect(result.current.totalPoints).toBe(0);
    expect(localStorage.getItem('wr_daily_activities')).toBeNull();
  });
});

describe('useFaithPoints — authenticated', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('returns loaded values from localStorage when authenticated', () => {
    const activities = { ...freshDailyActivities(), mood: true, pointsEarned: 5, multiplier: 1 };
    localStorage.setItem('wr_daily_activities', JSON.stringify({ '2026-03-16': activities }));
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 250, currentLevel: 2, currentLevelName: 'Sprout',
      pointsToNextLevel: 250, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));
    localStorage.setItem('wr_streak', JSON.stringify({
      currentStreak: 5, longestStreak: 10, lastActiveDate: '2026-03-16',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.totalPoints).toBe(250);
    expect(result.current.currentLevel).toBe(2);
    expect(result.current.levelName).toBe('Sprout');
    expect(result.current.todayActivities.mood).toBe(true);
    expect(result.current.todayPoints).toBe(5);
    expect(result.current.currentStreak).toBe(5);
    expect(result.current.longestStreak).toBe(10);
  });

  it('recordActivity("pray") sets pray=true and adds 10 points (1x)', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
    });

    expect(result.current.todayActivities.pray).toBe(true);
    expect(result.current.todayPoints).toBe(10);
    expect(result.current.totalPoints).toBe(10);
  });

  it('recordActivity("pray") second call is a no-op (idempotent)', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
    });
    const pointsAfterFirst = result.current.totalPoints;

    act(() => {
      result.current.recordActivity('pray');
    });
    expect(result.current.totalPoints).toBe(pointsAfterFirst);
  });

  it('recordActivity with 2 activities applies 1.25x multiplier', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood');
    });
    expect(result.current.todayPoints).toBe(5); // 5 × 1x

    act(() => {
      result.current.recordActivity('pray');
    });
    // mood(5) + pray(10) = 15 × 1.25 = 18.75 → 19
    expect(result.current.todayPoints).toBe(19);
    expect(result.current.todayMultiplier).toBe(1.25);
  });

  it('recordActivity with 4 activities applies 1.5x multiplier', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood');
      result.current.recordActivity('pray');
      result.current.recordActivity('listen');
      result.current.recordActivity('prayerWall');
    });

    // mood(5) + pray(10) + listen(10) + prayerWall(15) = 40 × 1.5 = 60
    expect(result.current.todayPoints).toBe(60);
    expect(result.current.todayMultiplier).toBe(1.5);
  });

  it('recordActivity with all 6 applies 2x = 170 points', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood');
      result.current.recordActivity('pray');
      result.current.recordActivity('listen');
      result.current.recordActivity('prayerWall');
      result.current.recordActivity('meditate');
      result.current.recordActivity('journal');
    });

    expect(result.current.todayPoints).toBe(170);
    expect(result.current.todayMultiplier).toBe(2);
  });

  it('recordActivity updates streak on first activity of the day', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    expect(result.current.currentStreak).toBe(0);

    act(() => {
      result.current.recordActivity('pray');
    });

    expect(result.current.currentStreak).toBe(1);
    expect(result.current.longestStreak).toBe(1);
  });

  it('recordActivity detects level-up when crossing threshold', () => {
    // Start at 95 points (5 away from Sprout)
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 95, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 5, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentLevel).toBe(1);

    act(() => {
      result.current.recordActivity('pray'); // +10 → 105 total → Sprout
    });

    expect(result.current.currentLevel).toBe(2);
    expect(result.current.levelName).toBe('Sprout');
  });

  it('recordActivity does not fire level-up when staying same level', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 50, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 50, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood'); // +5 → 55, still Seedling
    });

    expect(result.current.currentLevel).toBe(1);
    expect(result.current.levelName).toBe('Seedling');
  });

  it('mood auto-detect on init from wr_mood_entries', () => {
    const entries = [makeMoodEntry({ date: '2026-03-16' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    expect(result.current.todayActivities.mood).toBe(true);
  });

  it('state persists across hook re-mount (page reload simulation)', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
      result.current.recordActivity('journal');
    });

    const pointsBefore = result.current.totalPoints;
    unmount();

    // Re-mount
    const { result: result2 } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result2.current.totalPoints).toBe(pointsBefore);
    expect(result2.current.todayActivities.pray).toBe(true);
    expect(result2.current.todayActivities.journal).toBe(true);
  });

  it('point recalculation correct when multiplier tier changes', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood'); // 5 × 1x = 5
    });
    expect(result.current.totalPoints).toBe(5);

    act(() => {
      result.current.recordActivity('pray'); // (5+10) × 1.25 = 19, diff = 14
    });
    expect(result.current.totalPoints).toBe(19);
  });

  it('all 3 localStorage keys updated after recordActivity', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray');
    });

    expect(localStorage.getItem('wr_daily_activities')).not.toBeNull();
    expect(localStorage.getItem('wr_faith_points')).not.toBeNull();
    expect(localStorage.getItem('wr_streak')).not.toBeNull();

    const activities = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(activities['2026-03-16'].pray).toBe(true);
  });

  it('corrupted localStorage handled gracefully on init', () => {
    localStorage.setItem('wr_daily_activities', 'bad json');
    localStorage.setItem('wr_faith_points', '{broken');
    localStorage.setItem('wr_streak', '[not valid]');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.totalPoints).toBe(0);
    expect(result.current.currentStreak).toBe(0);
  });

  it('localStorage unavailable — no crash, returns defaults', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.totalPoints).toBe(0);

    vi.restoreAllMocks();
  });
});
