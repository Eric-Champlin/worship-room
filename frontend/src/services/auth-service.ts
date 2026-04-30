/**
 * Thin functional wrappers around apiFetch for the 4 Phase 1 auth endpoints.
 * No React, no state — AuthContext owns all stateful concerns.
 *
 * Endpoints:
 *   POST /api/v1/auth/register  → registerUser (anti-enumeration)
 *   POST /api/v1/auth/login     → loginUser (stores JWT + returns AuthUser)
 *   POST /api/v1/auth/logout    → logoutUser (fire-and-forget + clears token)
 *   GET  /api/v1/users/me       → getCurrentUser (full profile + isEmailVerified)
 *
 * Introduced by Spec 1.9 (Frontend AuthContext JWT Migration, Phase 1).
 */

import { apiFetch } from '@/lib/api-client'
import { setStoredToken, clearStoredToken } from '@/lib/auth-storage'
import type {
  AuthUser,
  LoginCredentials,
  RegisterRequest,
} from '@/types/auth'

/** Shape of UserSummary embedded in AuthResponse from /auth/login. */
interface UserSummaryWire {
  id: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  isAdmin: boolean
  timezone: string | null
}

/** Full UserResponse from GET/PATCH /users/me — includes isEmailVerified, legal versions, and profile fields. */
interface UserResponseWire extends UserSummaryWire {
  displayNamePreference: string
  customDisplayName: string | null
  avatarUrl: string | null
  bio: string | null
  favoriteVerseReference: string | null
  favoriteVerseText: string | null
  isEmailVerified: boolean
  joinedAt: string
  // Spec 1.10f. Null for legacy users.
  termsVersion: string | null
  privacyVersion: string | null
}

interface AuthResponseWire {
  token: string
  user: UserSummaryWire
}

interface RegisterResponseWire {
  registered: boolean
}

function toAuthUserFromSummary(u: UserSummaryWire): AuthUser {
  // isEmailVerified is hardcoded false here because the backend's UserSummary
  // (embedded in /auth/login responses) does not carry it. Boot-time
  // /users/me hydration returns the full UserResponse and corrects this to
  // the real value on the next page load. Known transient inconsistency
  // between login-time and reload-time state. Acceptable because no consumer
  // gates on isEmailVerified until Spec 1.5d (Email Verification) ships its
  // @RequireVerifiedEmail write-endpoint annotation. If a consumer starts
  // reading isEmailVerified before 1.5d lands, add an immediate post-login
  // getCurrentUser() hydration step to eliminate the transient.
  return {
    id: u.id,
    name: u.displayName,
    displayName: u.displayName,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isAdmin: u.isAdmin,
    timezone: u.timezone,
    isEmailVerified: false,
    // termsVersion + privacyVersion are not in the login summary; hydrated by
    // boot-time getCurrentUser() on next page load. Same transient pattern as
    // isEmailVerified above (Spec 1.10f).
    termsVersion: null,
    privacyVersion: null,
  }
}

function toAuthUserFromResponse(u: UserResponseWire): AuthUser {
  return {
    id: u.id,
    name: u.displayName,
    displayName: u.displayName,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isAdmin: u.isAdmin,
    timezone: u.timezone,
    isEmailVerified: u.isEmailVerified,
    termsVersion: u.termsVersion,
    privacyVersion: u.privacyVersion,
  }
}

/**
 * Sends registration request. Backend is anti-enumeration — same 200 response
 * for new AND existing emails, so this function does NOT reveal whether the
 * email was already taken. On success, caller must call loginUser to obtain
 * a token (auto-login pattern in AuthContext.register).
 */
export async function registerUser(req: RegisterRequest): Promise<void> {
  await apiFetch<RegisterResponseWire>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(req),
    skipAuth: true,
  })
  // Backend's { registered: true } isn't meaningful beyond success signalling.
}

/**
 * Logs in with credentials. Stores JWT in wr_jwt_token on success and returns
 * the hydrated user. Throws ApiError on 401 (INVALID_CREDENTIALS) or 429
 * (RATE_LIMITED).
 */
export async function loginUser(
  creds: LoginCredentials,
): Promise<AuthUser> {
  const data = await apiFetch<AuthResponseWire>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(creds),
    skipAuth: true,
  })
  setStoredToken(data.token)
  return toAuthUserFromSummary(data.user)
}

/**
 * Fires POST /api/v1/auth/logout fire-and-forget. Clears the stored token
 * even if the request fails — UX is prioritized over server ack.
 */
export async function logoutUser(): Promise<void> {
  try {
    // Public endpoint — skipAuth not set (passing the token lets future
    // Spec 1.5g session invalidation identify which session to revoke).
    await apiFetch<void>('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // Swallow — logout should never block UX
  } finally {
    clearStoredToken()
  }
}

/**
 * Fetches the current user using the stored Bearer token. Throws ApiError on
 * 401; apiFetch clears the token and fires AUTH_INVALIDATED_EVENT before
 * re-raising.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const data = await apiFetch<UserResponseWire>('/api/v1/users/me', {
    method: 'GET',
  })
  return toAuthUserFromResponse(data)
}
