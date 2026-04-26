// Hand-authored TypeScript bindings for POST /api/v1/activity.
//
// Until Forums Wave wires the openapi-typescript codegen pipeline (see
// 03-backend-standards.md § "OpenAPI Spec and Type Generation" — currently
// "hand-typed in the interim"), this file mirrors the OpenAPI schema in
// backend/src/main/resources/openapi.yaml § ActivityRequest /
// ActivityResponseData / StreakSnapshot / NewBadge / MultiplierTierSnapshot.
//
// When you change the backend OpenAPI spec for the activity endpoint,
// update this file in lockstep. A future codegen spec will replace this
// with auto-generated bindings; the migration target is
// frontend/src/types/api/generated.ts.

export type ActivityType =
  | 'mood'
  | 'pray'
  | 'listen'
  | 'prayerWall'
  | 'readingPlan'
  | 'meditate'
  | 'journal'
  | 'gratitude'
  | 'reflection'
  | 'challenge'
  | 'localVisit'
  | 'devotional';

export type CelebrationTier =
  | 'toast'
  | 'toast-confetti'
  | 'special-toast'
  | 'full-screen';

export interface ActivityRequest {
  activityType: ActivityType;
  sourceFeature: string;
  metadata?: Record<string, unknown> | null;
}

export interface StreakSnapshot {
  current: number;
  longest: number;
  newToday: boolean;
  graceUsed: number; // always 0 in current API
  graceRemaining: number; // always 0 in current API
}

export interface NewBadge {
  id: string;
  name: string;
  celebrationTier: CelebrationTier;
  earnedAt: string; // ISO-8601 with offset
}

export interface MultiplierTierSnapshot {
  label: string; // "" for base tier; else "Growing" | "Devoted" | "Full Worship Day"
  multiplier: number;
}

export interface ActivityResponseData {
  pointsEarned: number;
  totalPoints: number;
  currentLevel: number;
  levelUp: boolean;
  streak: StreakSnapshot;
  newBadges: NewBadge[];
  multiplierTier: MultiplierTierSnapshot;
}

export interface ActivityResponse {
  data: ActivityResponseData;
  meta: { requestId: string };
}
