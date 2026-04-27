import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

// Mock api-client and env modules so dual-write (Spec 2.7) tests can control
// the flag and assert the fetch payload. Defaults preserve existing test
// behavior: `isBackendActivityEnabled` returns false → dual-write skipped →
// existing tests run unchanged.
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>();
  return {
    ...actual,
    isBackendActivityEnabled: vi.fn(() => false),
  };
});

// Spec 2.10: mock the backfill service so it doesn't fire its own apiFetch
// alongside the Spec 2.7 dual-write call. Default `isBackfillCompleted=true`
// keeps the existing dual-write tests' single-call assertions valid; the new
// backfill-trigger tests below override it to false to exercise the trigger.
vi.mock('@/services/activity-backfill', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/activity-backfill')>();
  return {
    ...actual,
    triggerBackfill: vi.fn(),
    markBackfillCompleted: vi.fn(),
    isBackfillCompleted: vi.fn(() => true),
  };
});

import { AuthProvider } from '@/contexts/AuthContext';
import { useFaithPoints } from '../useFaithPoints';
import { freshDailyActivities } from '@/services/faith-points-storage';
import { apiFetch, AUTH_INVALIDATED_EVENT } from '@/lib/api-client';
import { isBackendActivityEnabled } from '@/lib/env';
import {
  triggerBackfill,
  markBackfillCompleted,
  isBackfillCompleted,
} from '@/services/activity-backfill';
import { ApiError } from '@/types/auth';
import type { MoodEntry, BadgeData } from '@/types/dashboard';

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
      prayerWall: false, readingPlan: false, meditate: false, journal: false, gratitude: false, reflection: false,
      challenge: false, localVisit: false, devotional: false,
    });
  });

  it('recordActivity is no-op when not authenticated', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
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
      result.current.recordActivity('pray', 'test');
    });

    expect(result.current.todayActivities.pray).toBe(true);
    expect(result.current.todayPoints).toBe(10);
    expect(result.current.totalPoints).toBe(10);
  });

  it('recordActivity("pray") second call is a no-op (idempotent)', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    const pointsAfterFirst = result.current.totalPoints;

    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    expect(result.current.totalPoints).toBe(pointsAfterFirst);
  });

  it('recordActivity with 2 activities applies 1.25x multiplier', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood', 'test');
    });
    expect(result.current.todayPoints).toBe(5); // 5 × 1x

    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    // mood(5) + pray(10) = 15 × 1.25 = 18.75 → 19
    expect(result.current.todayPoints).toBe(19);
    expect(result.current.todayMultiplier).toBe(1.25);
  });

  it('recordActivity with 4 activities applies 1.5x multiplier', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood', 'test');
      result.current.recordActivity('pray', 'test');
      result.current.recordActivity('listen', 'test');
      result.current.recordActivity('prayerWall', 'test');
    });

    // mood(5) + pray(10) + listen(10) + prayerWall(15) = 40 × 1.5 = 60
    expect(result.current.todayPoints).toBe(60);
    expect(result.current.todayMultiplier).toBe(1.5);
  });

  it('recordActivity with all 7 base activities applies 2x = 180 points', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('mood', 'test');
      result.current.recordActivity('pray', 'test');
      result.current.recordActivity('listen', 'test');
      result.current.recordActivity('prayerWall', 'test');
      result.current.recordActivity('meditate', 'test');
      result.current.recordActivity('journal', 'test');
      result.current.recordActivity('gratitude', 'test');
    });

    expect(result.current.todayPoints).toBe(180);
    expect(result.current.todayMultiplier).toBe(2);
  });

  it('recordActivity updates streak on first activity of the day', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    expect(result.current.currentStreak).toBe(0);

    act(() => {
      result.current.recordActivity('pray', 'test');
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
      result.current.recordActivity('pray', 'test'); // +10 → 105 total → Sprout
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
      result.current.recordActivity('mood', 'test'); // +5 → 55, still Seedling
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
      result.current.recordActivity('pray', 'test');
      result.current.recordActivity('journal', 'test');
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
      result.current.recordActivity('mood', 'test'); // 5 × 1x = 5
    });
    expect(result.current.totalPoints).toBe(5);

    act(() => {
      result.current.recordActivity('pray', 'test'); // (5+10) × 1.25 = 19, diff = 14
    });
    expect(result.current.totalPoints).toBe(19);
  });

  it('all 3 localStorage keys updated after recordActivity', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray', 'test');
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

describe('useFaithPoints — badge integration', () => {
  beforeEach(() => {
    simulateLogin();
  });

  function getBadges(): BadgeData {
    const raw = localStorage.getItem('wr_badges');
    return JSON.parse(raw!);
  }

  it('recordActivity integrates badge checking', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    const badges = getBadges();
    expect(badges).not.toBeNull();
    expect(badges.earned.first_prayer).toBeDefined();
  });

  it('recordActivity awards first_prayer on first pray activity', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    const badges = getBadges();
    expect(badges.earned.first_prayer).toBeDefined();
    expect(badges.earned.first_prayer.earnedAt).toBeTruthy();
  });

  it('recordActivity increments activityCounts.pray', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    const badges = getBadges();
    expect(badges.activityCounts.pray).toBe(1);
  });

  it('recordActivity does NOT increment activityCounts on idempotent call', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    act(() => {
      result.current.recordActivity('pray', 'test'); // idempotent — should be ignored
    });
    const badges = getBadges();
    expect(badges.activityCounts.pray).toBe(1);
  });

  it('recordActivity awards full_worship_day on 6th activity', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('mood', 'test');
      result.current.recordActivity('pray', 'test');
      result.current.recordActivity('listen', 'test');
      result.current.recordActivity('prayerWall', 'test');
      result.current.recordActivity('meditate', 'test');
      result.current.recordActivity('journal', 'test');
    });
    const badges = getBadges();
    expect(badges.earned.full_worship_day).toBeDefined();
    expect(badges.earned.full_worship_day.count).toBe(1);
    expect(badges.activityCounts.fullWorshipDays).toBe(1);
  });

  it('recordActivity full_worship_day count increments on next day', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });
    // Day 1 — all 6
    act(() => {
      result.current.recordActivity('mood', 'test');
      result.current.recordActivity('pray', 'test');
      result.current.recordActivity('listen', 'test');
      result.current.recordActivity('prayerWall', 'test');
      result.current.recordActivity('meditate', 'test');
      result.current.recordActivity('journal', 'test');
    });
    unmount();

    // Day 2
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0, 0));
    const { result: r2 } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      r2.current.recordActivity('mood', 'test');
      r2.current.recordActivity('pray', 'test');
      r2.current.recordActivity('listen', 'test');
      r2.current.recordActivity('prayerWall', 'test');
      r2.current.recordActivity('meditate', 'test');
      r2.current.recordActivity('journal', 'test');
    });
    const badges = getBadges();
    expect(badges.earned.full_worship_day.count).toBe(2);
    expect(badges.activityCounts.fullWorshipDays).toBe(2);
  });

  it('recordActivity awards streak_7 at streak day 7', () => {
    // Simulate 7 consecutive days
    for (let day = 10; day <= 16; day++) {
      vi.setSystemTime(new Date(2026, 2, day, 12, 0, 0));
      const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });
      act(() => { result.current.recordActivity('pray', 'test'); });
      unmount();
    }
    const badges = getBadges();
    expect(badges.earned.streak_7).toBeDefined();
  });

  it('recordActivity awards level badge on level-up', () => {
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 95, currentLevel: 1, currentLevelName: 'Seedling',
      pointsToNextLevel: 5, lastUpdated: '2026-03-16T00:00:00.000Z',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test'); // +10 → 105 → level 2
    });
    const badges = getBadges();
    expect(badges.earned.level_2).toBeDefined();
  });

  it('recordActivity creates wr_badges on first call for new auth user', () => {
    expect(localStorage.getItem('wr_badges')).toBeNull();
    renderHook(() => useFaithPoints(), { wrapper });
    // loadState initializes badges
    const badges = getBadges();
    expect(badges.earned.welcome).toBeDefined();
    expect(badges.earned.level_1).toBeDefined();
  });

  it('recordActivity badge data persists across page reload', () => {
    const { result, unmount } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    unmount();

    // Re-mount
    renderHook(() => useFaithPoints(), { wrapper });
    const badges = getBadges();
    expect(badges.earned.first_prayer).toBeDefined();
    expect(badges.activityCounts.pray).toBe(1);
  });
});

describe('useFaithPoints — streak capture on reset', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('captures previousStreak when streak resets (gap day)', () => {
    // Set up a 5-day streak, last active 2 days ago (March 14)
    localStorage.setItem('wr_streak', JSON.stringify({
      currentStreak: 5, longestStreak: 5, lastActiveDate: '2026-03-14',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentStreak).toBe(5);

    act(() => {
      result.current.recordActivity('pray', 'test');
    });

    // Streak resets to 1 (missed March 15)
    expect(result.current.currentStreak).toBe(1);

    // previousStreak captured in wr_streak_repairs
    const repairs = JSON.parse(localStorage.getItem('wr_streak_repairs')!);
    expect(repairs.previousStreak).toBe(5);
  });

  it('does NOT capture previousStreak on first-ever activity', () => {
    // No streak data — fresh user
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentStreak).toBe(0);

    act(() => {
      result.current.recordActivity('pray', 'test');
    });

    expect(result.current.currentStreak).toBe(1);
    expect(localStorage.getItem('wr_streak_repairs')).toBeNull();
  });

  it('does NOT capture previousStreak when streak continues (consecutive day)', () => {
    // Streak of 5, last active yesterday (March 15)
    localStorage.setItem('wr_streak', JSON.stringify({
      currentStreak: 5, longestStreak: 5, lastActiveDate: '2026-03-15',
    }));

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => {
      result.current.recordActivity('pray', 'test');
    });

    // Streak continues to 6
    expect(result.current.currentStreak).toBe(6);
    expect(localStorage.getItem('wr_streak_repairs')).toBeNull();
  });
});

describe('useFaithPoints — badge initialization & newlyEarned', () => {
  beforeEach(() => {
    simulateLogin();
  });

  function getBadges() {
    return JSON.parse(localStorage.getItem('wr_badges')!);
  }

  it('first authenticated session initializes wr_badges', () => {
    expect(localStorage.getItem('wr_badges')).toBeNull();
    renderHook(() => useFaithPoints(), { wrapper });
    expect(localStorage.getItem('wr_badges')).not.toBeNull();
  });

  it('welcome and level_1 in newlyEarnedBadges on first session', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.newlyEarnedBadges).toContain('welcome');
    expect(result.current.newlyEarnedBadges).toContain('level_1');
  });

  it('subsequent sessions do not re-initialize', () => {
    // First session
    const { unmount } = renderHook(() => useFaithPoints(), { wrapper });
    unmount();

    // Clear newlyEarned to simulate celebration processing
    const badges = getBadges();
    badges.newlyEarned = [];
    localStorage.setItem('wr_badges', JSON.stringify(badges));

    // Second session
    const { result: r2 } = renderHook(() => useFaithPoints(), { wrapper });
    // newlyEarned should be empty, not re-populated with welcome/level_1
    expect(r2.current.newlyEarnedBadges).toEqual([]);
  });

  it('clearNewlyEarnedBadges empties the array', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.newlyEarnedBadges.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearNewlyEarnedBadges();
    });
    expect(result.current.newlyEarnedBadges).toEqual([]);
    // Also cleared in localStorage
    const badges = getBadges();
    expect(badges.newlyEarned).toEqual([]);
  });

  it('newlyEarnedBadges updated after recordActivity awards badge', () => {
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    // Clear initial badges
    act(() => {
      result.current.clearNewlyEarnedBadges();
    });
    expect(result.current.newlyEarnedBadges).toEqual([]);

    // Record an activity
    act(() => {
      result.current.recordActivity('pray', 'test');
    });
    expect(result.current.newlyEarnedBadges).toContain('first_prayer');
  });

  it('unauthenticated user: newlyEarnedBadges is empty', () => {
    localStorage.clear(); // Remove auth
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.newlyEarnedBadges).toEqual([]);
  });

  it('logout preserves wr_badges', () => {
    renderHook(() => useFaithPoints(), { wrapper });
    expect(localStorage.getItem('wr_badges')).not.toBeNull();

    // Simulate logout: remove auth keys but keep badge data
    localStorage.removeItem('wr_auth_simulated');
    localStorage.removeItem('wr_user_name');
    localStorage.removeItem('wr_user_id');

    // wr_badges should still exist
    expect(localStorage.getItem('wr_badges')).not.toBeNull();
  });
});

describe('useFaithPoints — dual-write (Spec 2.7)', () => {
  beforeEach(() => {
    simulateLogin();
    vi.mocked(isBackendActivityEnabled).mockReturnValue(false);
    vi.mocked(apiFetch).mockReset();
  });

  // Group A — Flag-off behavior
  it('flag undefined → no backend call fires', async () => {
    // mockReturnValue(false) is the default in beforeEach (simulates undefined env)
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    expect(apiFetch).not.toHaveBeenCalled();
    // localStorage path still ran
    const stored = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(stored['2026-03-16'].pray).toBe(true);
  });

  it("flag === 'false' → no backend call fires", async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(false);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("flag === '' → no backend call fires (fail-closed)", async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(false);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  // Group B — Flag-on behavior
  it('flag on + authenticated → backend POST fires after localStorage write', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    let storageAtFetch: string | null = null;
    vi.mocked(apiFetch).mockImplementation(async () => {
      storageAtFetch = localStorage.getItem('wr_daily_activities');
      return undefined as never;
    });
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    // localStorage was already updated when the apiFetch mock fired
    expect(storageAtFetch).not.toBeNull();
    expect(JSON.parse(storageAtFetch!)['2026-03-16'].pray).toBe(true);
  });

  it('backend call body has correct activityType and sourceFeature', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    const [path, options] = vi.mocked(apiFetch).mock.calls[0];
    expect(path).toBe('/api/v1/activity');
    expect(options?.method).toBe('POST');
    const body = JSON.parse(options?.body as string);
    expect(body).toEqual({ activityType: 'pray', sourceFeature: 'daily_hub' });
    // metadata explicitly omitted
    expect(body.metadata).toBeUndefined();
  });

  it('recordActivity returns synchronously without awaiting backend', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    // Never-resolving promise — recordActivity must NOT block on it
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    let returnValue: unknown;
    act(() => {
      returnValue = result.current.recordActivity('pray', 'daily_hub');
    });
    expect(returnValue).toBeUndefined();
    // React state updated synchronously even though backend hasn't resolved
    expect(result.current.todayPoints).toBe(10);
    expect(result.current.todayActivities.pray).toBe(true);
  });

  // Group C — Error handling
  it('backend 500 → console.warn logged, no exception escapes, state preserved', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError('INTERNAL_ERROR', 500, 'server boom', null),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    expect(warnSpy.mock.calls[0][0]).toContain('backend dual-write failed');
    // State + localStorage still reflect the local write
    expect(result.current.totalPoints).toBe(10);
    expect(JSON.parse(localStorage.getItem('wr_daily_activities')!)['2026-03-16'].pray).toBe(true);
    warnSpy.mockRestore();
  });

  it('backend network error → console.warn logged, recordActivity completes normally', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError('NETWORK_ERROR', 0, 'Unable to reach the server.', null),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    expect(result.current.totalPoints).toBe(10);
    warnSpy.mockRestore();
  });

  it('backend 401 → ApiError caught + AUTH_INVALIDATED dispatched + warn fires', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    // Simulate apiFetch's real 401 path: dispatch the auth-invalidated event
    // and reject with ApiError. recordActivity's .catch handler still logs.
    vi.mocked(apiFetch).mockImplementation(async () => {
      window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT));
      throw new ApiError('UNAUTHENTICATED', 401, 'Unauthorized', null);
    });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    const authInvalidations = dispatchSpy.mock.calls.filter(
      (call) => (call[0] as CustomEvent).type === AUTH_INVALIDATED_EVENT,
    );
    expect(authInvalidations).toHaveLength(1);
    dispatchSpy.mockRestore();
    warnSpy.mockRestore();
  });

  // Group D — Idempotency
  it('same-day repeat → backend POST fires once only', async () => {
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
      // Second call hits the idempotency early-return at useFaithPoints.ts:146
      // before reaching the dual-write block.
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    // Flush microtasks once more — if a second dispatch were queued, it
    // would surface here. (Fake timers are active; setTimeout would hang.)
    await Promise.resolve();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});

describe('useFaithPoints — backfill trigger (Spec 2.10)', () => {
  beforeEach(() => {
    simulateLogin();
    vi.mocked(isBackendActivityEnabled).mockReturnValue(true);
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
    vi.mocked(triggerBackfill).mockReset();
    vi.mocked(markBackfillCompleted).mockReset();
    vi.mocked(isBackfillCompleted).mockReset();
    vi.mocked(triggerBackfill).mockResolvedValue({
      activityLogRowsInserted: 0,
      faithPointsUpdated: true,
      streakStateUpdated: true,
      badgesInserted: 0,
      activityCountsUpserted: 14,
    });
  });

  it('flag-off: triggers backfill once on first recordActivity, then marks completed', async () => {
    vi.mocked(isBackfillCompleted).mockReturnValue(false);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => expect(triggerBackfill).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(markBackfillCompleted).toHaveBeenCalledTimes(1));
  });

  it('flag-on: skips backfill on subsequent recordActivity calls', async () => {
    vi.mocked(isBackfillCompleted).mockReturnValue(true);
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    expect(triggerBackfill).not.toHaveBeenCalled();
    expect(markBackfillCompleted).not.toHaveBeenCalled();
  });

  it('backfill failure: warn logged, flag NOT set, dual-write still proceeds', async () => {
    vi.mocked(isBackfillCompleted).mockReturnValue(false);
    vi.mocked(triggerBackfill).mockRejectedValue(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    await act(async () => {
      result.current.recordActivity('pray', 'daily_hub');
    });
    await vi.waitFor(() => {
      expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('backfill failed'))).toBe(true);
    });
    expect(markBackfillCompleted).not.toHaveBeenCalled();
    // Dual-write still fired alongside the failed backfill
    expect(apiFetch).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
