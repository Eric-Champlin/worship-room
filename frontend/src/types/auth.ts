/**
 * Auth domain types — single source of truth consumed by AuthContext,
 * auth-service, api-client, and UI components (AuthModal).
 *
 * Introduced by Spec 1.9 (Frontend AuthContext JWT Migration, Phase 1).
 */

export interface AuthUser {
  id: string
  name: string
  displayName: string
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
  timezone: string | null
  isEmailVerified: boolean
  // Spec 1.10f. Null for legacy users (created before 1.10f shipped) and
  // for the transient login-summary state (login response doesn't carry
  // versions; `getCurrentUser()` rehydration on next page load fills them).
  termsVersion: string | null
  privacyVersion: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  timezone?: string
  // Spec 1.10f. Required ISO-8601 date strings; backend rejects mismatches
  // and missing values with 400. The frontend reads current values from
  // `useLegalVersions()` and includes them in every register call.
  termsVersion: string
  privacyVersion: string
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'ACCOUNT_LOCKED'
  | 'AUTO_LOGIN_FAILED'
  | 'NETWORK_ERROR'
  | 'VERSION_MISMATCH'
  | 'UNKNOWN'

export const AUTH_ERROR_COPY: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS:
    "That email and password don't match our records. Try again, or use Forgot Password.",
  VALIDATION_FAILED: 'Please check the fields below.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  ACCOUNT_LOCKED:
    'This account is temporarily locked. Please try again in a few minutes.',
  AUTO_LOGIN_FAILED: 'Your account is ready. Please log in to continue.',
  NETWORK_ERROR:
    "We couldn't reach the server. Check your connection and try again.",
  VERSION_MISMATCH:
    'The terms updated again while you were reading. Please review and accept the latest versions.',
  UNKNOWN: "Something didn't go through. Please try again.",
}

/**
 * Thrown from apiFetch when the backend returns a non-2xx response.
 * Consumed by AuthContext and re-thrown as AuthError for AuthModal mapping.
 */
export class ApiError extends Error {
  readonly name = 'ApiError'
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly requestId: string | null,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
  }
}

/**
 * Thrown by AuthContext's login/register. AuthModal catches and maps
 * .code → user-facing copy via AUTH_ERROR_COPY.
 */
export class AuthError extends Error {
  readonly name = 'AuthError'
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message)
  }
}
