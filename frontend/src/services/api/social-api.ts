/**
 * Social API client — Spec 2.5.4b (Frontend Social/Milestone Dual-Write).
 *
 * Wraps the three social-mutation endpoints as fire-and-forget calls from
 * useSocialInteractions. localStorage stays the source of truth for reads;
 * the backend receives a shadow copy. Failures are logged at the call site
 * (console.warn) and never block UX.
 *
 * Authorization header is attached automatically by apiFetch from auth-storage.
 */

import { apiFetch } from '@/lib/api-client'

interface SocialWriteResponse {
  id: string
  createdAt: string
}

/** POST /api/v1/social/encouragements */
export async function sendEncouragementApi(
  toUserId: string,
  message: string,
): Promise<SocialWriteResponse> {
  return apiFetch<SocialWriteResponse>('/api/v1/social/encouragements', {
    method: 'POST',
    body: JSON.stringify({ toUserId, message }),
  })
}

/** POST /api/v1/social/nudges */
export async function sendNudgeApi(toUserId: string): Promise<SocialWriteResponse> {
  return apiFetch<SocialWriteResponse>('/api/v1/social/nudges', {
    method: 'POST',
    body: JSON.stringify({ toUserId }),
  })
}

/** POST /api/v1/social/recap-dismissal */
export async function sendRecapDismissalApi(weekStart: string): Promise<SocialWriteResponse> {
  return apiFetch<SocialWriteResponse>('/api/v1/social/recap-dismissal', {
    method: 'POST',
    body: JSON.stringify({ weekStart }),
  })
}
