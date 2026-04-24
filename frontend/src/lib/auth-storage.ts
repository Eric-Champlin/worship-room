/**
 * Single file where the `wr_jwt_token` key string lives. All JWT read/write
 * operations route through the getters/setters below so the key name is
 * referenced in exactly one place.
 *
 * Legacy fallback keys (`wr_auth_simulated`, `wr_user_name`, `wr_user_id`)
 * are also surfaced here so AuthContext's backwards-compat readInitialState
 * path and `clearStoredLegacyAuth` (used on logout) have a single source.
 *
 * Introduced by Spec 1.9 (Frontend AuthContext JWT Migration, Phase 1).
 */

const TOKEN_KEY = 'wr_jwt_token'

/**
 * Returns the stored JWT, or null if not set / empty / localStorage unavailable.
 */
export function getStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    return token && token.length > 0 ? token : null
  } catch {
    return null
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* localStorage unavailable — no-op */
  }
}

export function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* no-op */
  }
}

/**
 * Legacy fallback keys — consumed by AuthContext's readInitialState backwards-
 * compat path and by the `mirrorToLegacyKeys` helper that keeps Phase-2-
 * unmigrated readers (useFaithPoints, activity engine, ListenTracker) working
 * for JWT-authed users until their Phase 2 migration specs land.
 *
 * Consumers outside AuthContext should NOT read these directly — use useAuth().
 */
export const LEGACY_KEYS = {
  simulated: 'wr_auth_simulated',
  userName: 'wr_user_name',
  userId: 'wr_user_id',
} as const

/**
 * Clears `wr_auth_simulated` and `wr_user_name` on logout. Deliberately
 * preserves `wr_user_id` to match the pre-1.9 AuthContext.logout() contract
 * (the UUID persists across logout so user-keyed localStorage data isn't lost).
 */
export function clearStoredLegacyAuth(): void {
  try {
    localStorage.removeItem(LEGACY_KEYS.simulated)
    localStorage.removeItem(LEGACY_KEYS.userName)
  } catch {
    /* no-op */
  }
}
