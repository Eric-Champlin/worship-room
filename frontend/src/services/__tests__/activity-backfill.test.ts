import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock api-client so tests can control the resolved value of triggerBackfill.
// faith-points-storage and badge-storage are NOT mocked — tests seed real
// localStorage and exercise the real read path through the storage helpers.
vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

import {
  isBackfillCompleted,
  markBackfillCompleted,
  triggerBackfill,
  assembleBackfillPayload,
} from '../activity-backfill';
import { apiFetch } from '@/lib/api-client';
import type { ActivityBackfillResponse } from '@/types/api/activity-backfill';

const COMPLETED_KEY = 'wr_activity_backfill_completed';

const SUCCESS_RESPONSE: ActivityBackfillResponse = {
  activityLogRowsInserted: 7,
  faithPointsUpdated: true,
  streakStateUpdated: true,
  badgesInserted: 2,
  activityCountsUpserted: 14,
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(apiFetch).mockReset();
});

afterEach(() => {
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────
// A) isBackfillCompleted (2 tests)
// ─────────────────────────────────────────────────────────────────

describe('isBackfillCompleted', () => {
  it('returns true when flag is the literal "true" string', () => {
    localStorage.setItem(COMPLETED_KEY, 'true');
    expect(isBackfillCompleted()).toBe(true);
  });

  it('returns false when flag is absent or any other value (fail-closed)', () => {
    expect(isBackfillCompleted()).toBe(false);

    const nonTruthyValues = ['false', '1', '', 'yes', 'TRUE', '{}'];
    for (const value of nonTruthyValues) {
      localStorage.setItem(COMPLETED_KEY, value);
      expect(isBackfillCompleted()).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// B) assembleBackfillPayload (3 tests)
// ─────────────────────────────────────────────────────────────────

describe('assembleBackfillPayload', () => {
  it('reads all four localStorage keys into the correct payload shape', () => {
    localStorage.setItem('wr_daily_activities', JSON.stringify({
      '2026-04-15': {
        mood: true, pray: true, listen: false, prayerWall: false,
        readingPlan: false, meditate: false, journal: false,
        gratitude: false, reflection: false, challenge: false,
        localVisit: false, devotional: false,
        pointsEarned: 15, multiplier: 1,
      },
      '2026-04-16': {
        mood: false, pray: true, listen: true, prayerWall: false,
        readingPlan: false, meditate: true, journal: false,
        gratitude: false, reflection: false, challenge: false,
        localVisit: false, devotional: false,
        pointsEarned: 40, multiplier: 1.25,
      },
    }));
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 125, currentLevel: 2,
      currentLevelName: 'Sprout', pointsToNextLevel: 375,
      lastUpdated: '2026-04-16T18:00:00Z',
    }));
    localStorage.setItem('wr_streak', JSON.stringify({
      currentStreak: 2, longestStreak: 5, lastActiveDate: '2026-04-16',
    }));
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {
        first_prayer: { earnedAt: '2026-04-15T17:00:00Z', count: 1 },
        level_2: { earnedAt: '2026-04-16T18:00:00Z' },
      },
      newlyEarned: [],
      activityCounts: {
        pray: 3, journal: 1, meditate: 1, listen: 2, prayerWall: 0,
        readingPlan: 0, gratitude: 0, reflection: 0, encouragementsSent: 0,
        fullWorshipDays: 0, challengesCompleted: 0, intercessionCount: 0,
        bibleChaptersRead: 0, prayerWallPosts: 0,
      },
    }));

    const payload = assembleBackfillPayload();

    expect(payload.schemaVersion).toBe(1);
    expect(typeof payload.userTimezone).toBe('string');
    expect(payload.userTimezone.length).toBeGreaterThan(0);

    expect(Object.keys(payload.activityLog)).toEqual(['2026-04-15', '2026-04-16']);
    expect(payload.activityLog['2026-04-15'].mood).toBe(true);
    expect(payload.activityLog['2026-04-15'].pray).toBe(true);
    expect(payload.activityLog['2026-04-15'].listen).toBe(false);
    expect(payload.activityLog['2026-04-16'].meditate).toBe(true);

    expect(payload.faithPoints).toEqual({ totalPoints: 125, currentLevel: 2 });
    expect(payload.streak).toEqual({
      currentStreak: 2, longestStreak: 5, lastActiveDate: '2026-04-16',
    });

    expect(payload.badges.earned.first_prayer).toEqual({
      earnedAt: '2026-04-15T17:00:00Z', count: 1,
    });
    expect(payload.badges.earned.level_2.earnedAt).toBe('2026-04-16T18:00:00Z');
    expect(payload.badges.activityCounts.pray).toBe(3);
    expect(payload.badges.activityCounts.bibleChaptersRead).toBe(0);
  });

  it('produces a valid empty-but-well-formed payload when localStorage is empty', () => {
    const payload = assembleBackfillPayload();

    expect(payload.schemaVersion).toBe(1);
    expect(payload.activityLog).toEqual({});
    expect(payload.faithPoints).toEqual({ totalPoints: 0, currentLevel: 1 });
    expect(payload.streak.currentStreak).toBe(0);
    expect(payload.streak.longestStreak).toBe(0);
    expect(payload.streak.lastActiveDate).toBeNull();
    expect(payload.badges.earned).toEqual({});
    // All 14 counters default to 0
    expect(payload.badges.activityCounts.pray).toBe(0);
    expect(payload.badges.activityCounts.prayerWallPosts).toBe(0);
    expect(Object.keys(payload.badges.activityCounts)).toHaveLength(14);
  });

  it('excludes streak-repair data from the payload (Divergence 2)', () => {
    localStorage.setItem('wr_streak_repairs', JSON.stringify({
      previousStreak: 5,
      lastRepairDate: '2026-04-10',
      freeRepairsUsedThisWeek: 1,
      weekStartDate: '2026-04-13',
    }));

    const payload = assembleBackfillPayload();

    // Negative assertion — payload must NOT contain streakRepairs at any depth
    expect((payload as unknown as Record<string, unknown>).streakRepairs).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('streakRepairs');
    expect(JSON.stringify(payload)).not.toContain('freeRepairsUsedThisWeek');
  });
});

// ─────────────────────────────────────────────────────────────────
// C) triggerBackfill (2 tests)
// ─────────────────────────────────────────────────────────────────

describe('triggerBackfill', () => {
  it('on success the caller can mark completed; flag is set after .then()', async () => {
    vi.mocked(apiFetch).mockResolvedValue(SUCCESS_RESPONSE);

    const result = await triggerBackfill();
    expect(result).toEqual(SUCCESS_RESPONSE);
    // Per AD #10, the caller (useFaithPoints) is responsible for marking completed
    // in the .then() — verify the contract: triggerBackfill itself does NOT set the flag
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull();
    // Caller pattern simulated:
    markBackfillCompleted();
    expect(localStorage.getItem(COMPLETED_KEY)).toBe('true');
  });

  it('on failure the flag is NOT set and the rejection propagates', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));

    await expect(triggerBackfill()).rejects.toThrow('Network error');
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// D) markBackfillCompleted (1 test)
// ─────────────────────────────────────────────────────────────────

describe('markBackfillCompleted', () => {
  it('sets the literal "true" string in localStorage', () => {
    expect(localStorage.getItem(COMPLETED_KEY)).toBeNull();
    markBackfillCompleted();
    expect(localStorage.getItem(COMPLETED_KEY)).toBe('true');
  });
});
