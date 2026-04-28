/**
 * Mutes API client — Spec 2.5.7.
 *
 * Wraps the Spec 2.5.7 mute endpoints as fire-and-forget calls from useMutes.
 * localStorage stays the source of truth for reads; the backend receives a
 * shadow copy. Failures are logged at the call site (console.warn) and never
 * block UX.
 *
 * Authorization header is attached automatically by apiFetch from auth-storage.
 */

import { apiFetch } from '@/lib/api-client'
import type {
  MuteUserRequest,
  MuteUserResponse,
  MutedUserApiResponse,
} from '@/types/api/mutes'

/** POST /api/v1/mutes — mute a user. */
export async function muteUserApi(userId: string): Promise<MuteUserResponse> {
  const body: MuteUserRequest = { userId }
  return apiFetch<MuteUserResponse>('/api/v1/mutes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** DELETE /api/v1/mutes/{userId} — unmute a user. */
export async function unmuteUserApi(userId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/mutes/${userId}`, { method: 'DELETE' })
}

/**
 * GET /api/v1/mutes — list users I've muted.
 *
 * Not consumed by any UI in Spec 2.5.7 — exposed for future Phase 3 work
 * that will reconcile localStorage `wr_mutes.muted` against backend truth.
 */
export async function listMutedUsersApi(): Promise<MutedUserApiResponse[]> {
  return apiFetch<MutedUserApiResponse[]>('/api/v1/mutes', { method: 'GET' })
}
