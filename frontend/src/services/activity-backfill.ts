/**
 * Frontend trigger and payload assembler for POST /api/v1/activity/backfill (Spec 2.10).
 *
 * One-time idempotent trigger; gated by the `wr_activity_backfill_completed`
 * localStorage flag. Reads from the four in-scope localStorage keys
 * (wr_daily_activities, wr_faith_points, wr_streak, wr_badges) and ships the
 * payload to the backend. localStorage is NEVER mutated by this module — it
 * stays canonical for reads.
 *
 * `wr_streak_repairs` is intentionally NOT included (Divergence 2 — backend
 * repair persistence not implemented).
 *
 * Used by useFaithPoints.recordActivity (Spec 2.10 § AD #10).
 */

import { apiFetch } from '@/lib/api-client';
import {
  getActivityLog,
  getFaithPoints,
  getStreakData,
} from './faith-points-storage';
import { getBadgeData } from './badge-storage';
import type {
  ActivityBackfillRequest,
  ActivityBackfillResponse,
  BackfillActivityFlags,
  BackfillBadgeEntry,
} from '@/types/api/activity-backfill';

const BACKFILL_COMPLETED_KEY = 'wr_activity_backfill_completed';

/**
 * Returns true if and only if the localStorage flag is the literal string 'true'.
 * Any other value (absent, 'false', '1', empty, JSON object, etc.) returns false.
 * Fail-closed by design.
 */
export function isBackfillCompleted(): boolean {
  try {
    return localStorage.getItem(BACKFILL_COMPLETED_KEY) === 'true';
  } catch {
    // localStorage may be unavailable; fail-closed → next dual-write retries
    return false;
  }
}

export function markBackfillCompleted(): void {
  try {
    localStorage.setItem(BACKFILL_COMPLETED_KEY, 'true');
  } catch {
    // localStorage unavailable; fail-silent (next dual-write retries)
  }
}

/**
 * Builds the backfill payload from the four in-scope localStorage keys.
 *
 * Per Divergence 1: counts come from `wr_badges.activityCounts`, NOT a
 * non-existent `wr_activity_counts` key.
 * Per Divergence 2: `wr_streak_repairs` is excluded.
 */
export function assembleBackfillPayload(): ActivityBackfillRequest {
  const activityLogRaw = getActivityLog();
  const faithPoints = getFaithPoints();
  const streak = getStreakData();
  const badges = getBadgeData();

  const activityLog: Record<string, BackfillActivityFlags> = {};
  for (const [date, entry] of Object.entries(activityLogRaw)) {
    activityLog[date] = {
      mood: !!entry.mood,
      pray: !!entry.pray,
      listen: !!entry.listen,
      prayerWall: !!entry.prayerWall,
      readingPlan: !!entry.readingPlan,
      meditate: !!entry.meditate,
      journal: !!entry.journal,
      gratitude: !!entry.gratitude,
      reflection: !!entry.reflection,
      challenge: !!entry.challenge,
      localVisit: !!entry.localVisit,
      devotional: !!entry.devotional,
      pointsEarned: entry.pointsEarned,
      multiplier: entry.multiplier,
    };
  }

  const earned: Record<string, BackfillBadgeEntry> = {};
  for (const [badgeId, e] of Object.entries(badges.earned)) {
    earned[badgeId] = { earnedAt: e.earnedAt, count: e.count };
  }

  return {
    schemaVersion: 1,
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    activityLog,
    faithPoints: {
      totalPoints: faithPoints.totalPoints,
      currentLevel: faithPoints.currentLevel,
    },
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActiveDate: streak.lastActiveDate,
    },
    badges: {
      earned,
      activityCounts: { ...badges.activityCounts },
    },
  };
}

/**
 * Fire-and-forget trigger. Resolves on 200; rejects on any other status or
 * network error. The .then() in the caller (useFaithPoints) is the ONLY
 * place markBackfillCompleted is called — never inside this function.
 */
export async function triggerBackfill(): Promise<ActivityBackfillResponse> {
  const payload = assembleBackfillPayload();
  return apiFetch<ActivityBackfillResponse>('/api/v1/activity/backfill', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
