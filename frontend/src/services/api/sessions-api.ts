/**
 * Sessions API client — Spec 1.5g.
 *
 * Wraps the four `/api/v1/sessions/*` endpoints. apiFetch attaches the
 * Authorization header automatically from auth-storage.
 *
 * Errors bubble through as ApiError with codes:
 * - UNAUTHORIZED / TOKEN_* (401) — missing/invalid/revoked JWT; apiFetch's
 *   global handler clears the token and dispatches wr:auth-invalidated.
 * - SESSION_RATE_LIMITED (429) — too many calls in the rate-limit window.
 * - FORBIDDEN (403) — cross-user revoke or unknown sessionId (anti-enumeration
 *   per W7/W9 — same response shape for both cases).
 */

import { apiFetch } from '@/lib/api-client'
import type { Session } from '@/types/api/sessions'

/** GET /api/v1/sessions — list current user's active sessions. */
export async function listSessionsApi(): Promise<Session[]> {
  return apiFetch<Session[]>('/api/v1/sessions', { method: 'GET' })
}

/** DELETE /api/v1/sessions/{sessionId} — revoke one specific session. */
export async function revokeSessionApi(sessionId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' })
}

/** DELETE /api/v1/sessions/all-others — revoke every session except current. */
export async function revokeAllOtherSessionsApi(): Promise<void> {
  await apiFetch<void>('/api/v1/sessions/all-others', { method: 'DELETE' })
}

/**
 * DELETE /api/v1/sessions/all — revoke every session including current.
 *
 * Returns 204 immediately; the current request's token now fails 401
 * TOKEN_REVOKED on the next call. Frontend handles the redirect after this
 * resolves successfully.
 */
export async function revokeAllSessionsApi(): Promise<void> {
  await apiFetch<void>('/api/v1/sessions/all', { method: 'DELETE' })
}
