// Spec 6.2 — Quick Lift types. Mirrors the OpenAPI shape at
// backend/src/main/resources/openapi.yaml (/api/v1/quick-lift/start and
// /api/v1/quick-lift/{sessionId}/complete). Hand-typed in the interim until
// the openapi-typescript pipeline is wired up.

export interface QuickLiftStartResponse {
  sessionId: string;
  /** ISO 8601 datetime — Postgres `NOW()` at session creation. */
  serverStartedAt: string;
}

export interface QuickLiftBadgeUnlocked {
  id: string;
  name: string;
  celebrationTier: 'toast' | 'toast-confetti' | 'special-toast' | 'full-screen';
  earnedAt: string;
}

export interface QuickLiftCompleteResponse {
  activityRecorded: boolean;
  pointsAwarded: number;
  badgesUnlocked: QuickLiftBadgeUnlocked[];
}

/** Local state machine for the QuickLiftOverlay + useQuickLift hook. */
export type QuickLiftSessionState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'running'; sessionId: string; serverStartedAt: number }
  | { phase: 'completing'; sessionId: string }
  | { phase: 'complete'; response: QuickLiftCompleteResponse }
  | { phase: 'error'; code: string; message: string };
