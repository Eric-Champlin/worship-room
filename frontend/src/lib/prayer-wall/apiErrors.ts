/**
 * Prayer Wall API error helpers — Spec 3.10 (Frontend Service API Implementations).
 *
 * Two responsibilities:
 *
 * 1. `AnonymousWriteAttemptError` — thrown by `services/api/prayer-wall-api.ts`
 *    write functions BEFORE any network call when no JWT is stored. Consumers
 *    catch this specific class and call `openAuthModal()` (D8). Avoids a 401
 *    round-trip and the spurious `wr:auth-invalidated` event that would
 *    log out a user whose actual state is "no token, never logged in."
 *
 * 2. `mapApiErrorToToast(error)` — maps an `ApiError` (from `@/types/auth`)
 *    to user-facing toast props (D9 taxonomy). Returns `{message, severity,
 *    retryAfterSeconds?}` so consumers can plumb to either `<Toast>` or
 *    `<FormError>`. Anti-pressure compliant: sentence case + period, no
 *    exclamations, no urgency framing.
 *
 * Mirrors AUTH_ERROR_COPY from types/auth.ts.
 */

import { ApiError } from '@/types/auth'

/**
 * Thrown by Prayer Wall write API functions when invoked without a stored
 * JWT. Consumers catch this and trigger the AuthModal instead of letting
 * the request 401-bounce.
 */
export class AnonymousWriteAttemptError extends Error {
  readonly name = 'AnonymousWriteAttemptError'
  constructor(operation: string) {
    super(
      `Cannot ${operation} as an anonymous user. Open the auth modal first.`,
    )
  }
}

/**
 * Severity of an API-error-driven toast. Consumers map this to
 * `<Toast type="error">` / `<Toast type="warning">` / `<FormError severity="error">`.
 */
export type ToastSeverity = 'error' | 'warning' | 'info'

export interface ToastDescriptor {
  message: string
  severity: ToastSeverity
  /** Seconds to wait before retry — only set on 429 from the backend's Retry-After header. */
  retryAfterSeconds?: number
}

/**
 * Canonical anti-pressure toast copy for Prayer Wall API failures (D9).
 *
 * Anti-Pressure Copy Checklist:
 *  [x] No comparison framing
 *  [x] No urgency language
 *  [x] No exclamation points near vulnerability
 *  [x] No therapy-app jargon
 *  [x] No streak-as-shame
 *  [x] No false-scarcity
 *
 * Sentence case + period terminator on every string. Pastor's-wife test passed.
 */
export const PRAYER_WALL_API_ERROR_COPY = {
  NETWORK_ERROR: "We couldn't reach the server. Try again in a moment.",
  /** Suffix appended via `formatRateLimitMessage(retryAfter)`. */
  RATE_LIMITED: 'Slow down a moment. You can post again in {seconds} seconds.',
  EDIT_WINDOW_EXPIRED: 'This post is past the 5-minute edit window.',
  VALIDATION_FAILED: 'Something in your post needs another look. {serverMessage}',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: 'That post is no longer available.',
  IDEMPOTENCY_KEY_MISMATCH: "Something didn't go through. Try again.",
  SERVER_ERROR: 'Something went wrong on our end. Try again in a moment.',
  UNKNOWN: 'Something went wrong. Try again in a moment.',
} as const

/** Format the rate-limit message with a Retry-After number. */
function formatRateLimitMessage(seconds: number): string {
  return PRAYER_WALL_API_ERROR_COPY.RATE_LIMITED.replace(
    '{seconds}',
    String(seconds),
  )
}

/** Format the validation message with a server-supplied trailer. */
function formatValidationMessage(serverMessage: string): string {
  // Server message may be empty; if so, just the prefix.
  const trimmed = serverMessage?.trim()
  if (!trimmed || trimmed.length === 0) {
    return PRAYER_WALL_API_ERROR_COPY.VALIDATION_FAILED.replace(
      ' {serverMessage}',
      '',
    )
  }
  return PRAYER_WALL_API_ERROR_COPY.VALIDATION_FAILED.replace(
    '{serverMessage}',
    trimmed,
  )
}

/**
 * Maps an `ApiError` to a toast descriptor per D9 taxonomy.
 *
 * Special handling:
 *  - `code === 'EDIT_WINDOW_EXPIRED'` (regardless of status 409 / other) wins
 *    over the generic 4xx mapping — Phase 3 Addendum #1.
 *  - `code === 'IDEMPOTENCY_KEY_MISMATCH'` (typically status 422 per OpenAPI) wins
 *    over the generic 4xx mapping.
 *  - 401 returns `{message: '', severity: 'error'}` — apiFetch already cleared
 *    the token and dispatched `wr:auth-invalidated`; no toast is shown for 401
 *    so the AuthModal trigger isn't doubled up.
 *  - 429 with a numeric `Retry-After` header is parsed via `parseRetryAfter`.
 */
export function mapApiErrorToToast(
  error: ApiError,
  retryAfterSeconds?: number,
): ToastDescriptor {
  // Error-code-driven specials first (some statuses overload — e.g., 409 is
  // BOTH the edit-window case and the generic conflict; the code disambiguates).
  if (error.code === 'EDIT_WINDOW_EXPIRED') {
    return {
      message: PRAYER_WALL_API_ERROR_COPY.EDIT_WINDOW_EXPIRED,
      severity: 'warning',
    }
  }
  if (error.code === 'IDEMPOTENCY_KEY_MISMATCH') {
    return {
      message: PRAYER_WALL_API_ERROR_COPY.IDEMPOTENCY_KEY_MISMATCH,
      severity: 'error',
    }
  }

  // Status-code-driven generics.
  if (error.status === 0 || error.code === 'NETWORK_ERROR') {
    return {
      message: PRAYER_WALL_API_ERROR_COPY.NETWORK_ERROR,
      severity: 'warning',
    }
  }
  if (error.status === 429) {
    return {
      message:
        retryAfterSeconds && retryAfterSeconds > 0
          ? formatRateLimitMessage(retryAfterSeconds)
          : PRAYER_WALL_API_ERROR_COPY.RATE_LIMITED.replace(
              ' {seconds}',
              ' a few',
            ),
      severity: 'warning',
      retryAfterSeconds,
    }
  }
  if (error.status === 401) {
    return { message: '', severity: 'error' }
  }
  if (error.status === 403) {
    return { message: PRAYER_WALL_API_ERROR_COPY.FORBIDDEN, severity: 'error' }
  }
  if (error.status === 404) {
    return { message: PRAYER_WALL_API_ERROR_COPY.NOT_FOUND, severity: 'error' }
  }
  if (error.status === 400 || error.status === 422) {
    return {
      message: formatValidationMessage(error.message),
      severity: 'error',
    }
  }
  if (error.status >= 500) {
    return {
      message: PRAYER_WALL_API_ERROR_COPY.SERVER_ERROR,
      severity: 'error',
    }
  }
  return { message: PRAYER_WALL_API_ERROR_COPY.UNKNOWN, severity: 'error' }
}

/**
 * Parses the `Retry-After` header from a Response. Returns the integer seconds,
 * or undefined if the header is absent or unparseable. Per RFC 7231, the value
 * may also be an HTTP-date — Worship Room's backend always emits integer seconds
 * (Spec 1 RateLimitFilter), so this parser only handles that shape.
 */
export function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined
  const n = Number.parseInt(headerValue, 10)
  if (Number.isNaN(n) || n < 0) return undefined
  return n
}
