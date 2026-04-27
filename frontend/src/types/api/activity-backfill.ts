// Hand-authored TypeScript bindings for POST /api/v1/activity/backfill (Spec 2.10).
//
// Mirrors backend/src/main/resources/openapi.yaml § ActivityBackfillRequest /
// ActivityBackfillResponse and their nested schemas. Update in lockstep with
// the OpenAPI spec until the codegen pipeline replaces this file with
// auto-generated bindings (target: frontend/src/types/api/generated.ts).

export interface BackfillActivityFlags {
  mood: boolean;
  pray: boolean;
  listen: boolean;
  prayerWall: boolean;
  readingPlan: boolean;
  meditate: boolean;
  journal: boolean;
  gratitude: boolean;
  reflection: boolean;
  challenge: boolean;
  localVisit: boolean;
  devotional: boolean;
  pointsEarned?: number | null;
  multiplier?: number | null;
}

export interface BackfillFaithPoints {
  totalPoints: number;
  currentLevel: number;
}

export interface BackfillStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
}

export interface BackfillBadgeEntry {
  earnedAt?: string | null;
  count?: number | null;
}

export interface BackfillActivityCounts {
  pray: number;
  journal: number;
  meditate: number;
  listen: number;
  prayerWall: number;
  readingPlan: number;
  gratitude: number;
  reflection: number;
  encouragementsSent: number;
  fullWorshipDays: number;
  challengesCompleted: number;
  intercessionCount: number;
  bibleChaptersRead: number;
  prayerWallPosts: number;
}

export interface BackfillBadges {
  earned: Record<string, BackfillBadgeEntry>;
  activityCounts: BackfillActivityCounts;
}

export interface ActivityBackfillRequest {
  schemaVersion: number;
  userTimezone: string;
  activityLog: Record<string, BackfillActivityFlags>;
  faithPoints: BackfillFaithPoints;
  streak: BackfillStreak;
  badges: BackfillBadges;
}

export interface ActivityBackfillResponse {
  activityLogRowsInserted: number;
  faithPointsUpdated: boolean;
  streakStateUpdated: boolean;
  badgesInserted: number;
  activityCountsUpserted: number;
}
