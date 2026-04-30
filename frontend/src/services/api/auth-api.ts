/**
 * Auth API client — Spec 1.5c (Change Password).
 *
 * POST /api/v1/auth/change-password requires authentication. Returns 204 No
 * Content on success; apiFetch returns undefined for 204 per its envelope
 * convention.
 *
 * Errors bubble through as ApiError with codes:
 * - CURRENT_PASSWORD_INCORRECT (403) — user entered wrong current password.
 *   Returned as 403 (not 401) so apiFetch's global 401 handler does NOT clear
 *   the token + force-logout the user on a wrong-password attempt.
 * - PASSWORDS_MUST_DIFFER (400) — new password matches current
 * - VALIDATION_FAILED (400) — new password too short, blank fields, etc.
 * - CHANGE_PASSWORD_RATE_LIMITED (429) — 5 attempts/15min exceeded
 * - UNAUTHORIZED / TOKEN_* (401) — missing/invalid/expired JWT (apiFetch handles
 *   the 401 by clearing the token and dispatching wr:auth-invalidated)
 *
 * Future spec (1.5b password reset, 1.5e change email) will add more functions
 * to this module.
 */

import { apiFetch } from '@/lib/api-client'

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
