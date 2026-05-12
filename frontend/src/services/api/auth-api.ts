/**
 * Auth API client — Spec 1.5c + Spec 1.5g (Change Password + Session Invalidation).
 *
 * POST /api/v1/auth/change-password requires authentication. Spec 1.5g changed
 * the response from 204 No Content to 200 OK carrying a fresh JWT. The new
 * token reflects the post-increment session_generation; this device's caller
 * swaps the stored token in place so the current session continues seamlessly
 * while other devices' tokens are invalidated server-side.
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
import { setStoredToken } from '@/lib/auth-storage'

export interface ChangePasswordResult {
  token: string
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const result = await apiFetch<ChangePasswordResult>('/api/v1/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  // Spec 1.5g — swap to the new token in place so the current device continues
  // seamlessly. Other devices' tokens (with stale `gen` claim) now fail their
  // next request with 401 TOKEN_REVOKED.
  if (result?.token) {
    setStoredToken(result.token)
  }
  return result
}
