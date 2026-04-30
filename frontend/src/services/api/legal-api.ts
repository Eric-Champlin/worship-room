/**
 * Legal API client — Spec 1.10f.
 *
 * GET /api/v1/legal/versions is public (no Authorization header required).
 * apiFetch harmlessly attaches Bearer if a token is stored — backend ignores
 * it on this route.
 *
 * POST /api/v1/users/me/legal/accept requires authentication. Returns 204 No
 * Content on success; apiFetch returns undefined for 204 per its envelope
 * convention.
 *
 * Errors: VERSION_MISMATCH (400) and RATE_LIMITED (429) bubble through as
 * ApiError. Callers handle ApiError.code branching.
 */

import { apiFetch } from '@/lib/api-client'

export interface LegalVersions {
  termsVersion: string
  privacyVersion: string
  communityGuidelinesVersion: string
}

export async function getLegalVersionsApi(): Promise<LegalVersions> {
  return apiFetch<LegalVersions>('/api/v1/legal/versions', {
    method: 'GET',
  })
}

export async function acceptLegalVersionsApi(
  termsVersion: string,
  privacyVersion: string,
): Promise<void> {
  await apiFetch<void>('/api/v1/users/me/legal/accept', {
    method: 'POST',
    body: JSON.stringify({ termsVersion, privacyVersion }),
  })
}
