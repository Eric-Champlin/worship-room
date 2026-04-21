/**
 * Typed error classes for the Gemini client (BB-30).
 *
 * The hook (`useExplainPassage`) uses `instanceof` checks on these classes to
 * classify failures and map them to user-facing copy. The client
 * (`geminiClient.ts`) throws these; nothing else does.
 *
 * Each class preserves the original SDK/runtime error as `cause` for debugging
 * without leaking the cause to the UI.
 *
 * Note: the `cause` property is assigned manually instead of via the ES2022
 * `Error` constructor options bag, because this project's tsconfig targets
 * ES2020 which doesn't include the second constructor arg in its lib types.
 */

interface ErrorOptions {
  cause?: unknown
}

function assignCause(err: Error, options?: ErrorOptions): void {
  if (options && 'cause' in options) {
    Object.defineProperty(err, 'cause', {
      value: options.cause,
      enumerable: false,
      writable: true,
      configurable: true,
    })
  }
}

/**
 * Thrown when the SDK or underlying fetch failed before reaching the Gemini API
 * (offline, DNS failure, CORS failure, TypeError from fetch).
 *
 * User-facing copy: "Couldn't load an explanation right now. Check your
 * connection and try again."
 */
export class GeminiNetworkError extends Error {
  constructor(
    message = 'Gemini request failed to reach the API',
    options?: ErrorOptions,
  ) {
    super(message)
    this.name = 'GeminiNetworkError'
    assignCause(this, options)
  }
}

/**
 * Thrown when the Gemini API returned a non-success response
 * (invalid key, quota exceeded, service down, 5xx, unknown SDK failure).
 *
 * User-facing copy: "This feature is temporarily unavailable. Try again in a
 * few minutes."
 */
export class GeminiApiError extends Error {
  constructor(
    message = 'Gemini API returned an error response',
    options?: ErrorOptions,
  ) {
    super(message)
    this.name = 'GeminiApiError'
    assignCause(this, options)
  }
}

/**
 * Thrown when Gemini's safety layer blocked the response — either at the
 * prompt level (`promptFeedback.blockReason`) or the output level
 * (`candidates[0].finishReason === 'SAFETY'`), or when the response text is
 * silently empty.
 *
 * User-facing copy: "This passage is too difficult for our AI helper to
 * explain well. Consider reading a scholarly commentary or asking a trusted
 * teacher."
 */
export class GeminiSafetyBlockError extends Error {
  constructor(
    message = 'Gemini blocked the response due to safety filters',
    options?: ErrorOptions,
  ) {
    super(message)
    this.name = 'GeminiSafetyBlockError'
    assignCause(this, options)
  }
}

/**
 * Thrown when the request exceeded the 30-second timeout budget (via
 * `AbortSignal.timeout`) or was otherwise aborted.
 *
 * User-facing copy: "The request took too long. Try again in a moment."
 */
export class GeminiTimeoutError extends Error {
  constructor(
    message = 'Gemini request timed out after 30 seconds',
    options?: ErrorOptions,
  ) {
    super(message)
    this.name = 'GeminiTimeoutError'
    assignCause(this, options)
  }
}

/**
 * Thrown when a request was denied by the client-side rate limiter (BB-32).
 *
 * Carries `retryAfterSeconds` so the UI can render a live countdown. The
 * hook exposes this on its state via the `'rate-limit'` error kind.
 *
 * Mental model: BB-32's rate limiter is courtesy, not security — it
 * protects against accidental bursts and dev-tools loops, not coordinated
 * abuse. A `RateLimitError` means "you're tapping faster than our AI
 * helper can keep up", not "you've hit a hard quota".
 *
 * User-facing copy (assembled by the hook's `ERROR_COPY['rate-limit']`):
 * "You're going faster than our AI helper can keep up. Try again in
 * {seconds} seconds." — where `{seconds}` is a live countdown rendered
 * by `ExplainSubViewError`.
 */
export class RateLimitError extends Error {
  retryAfterSeconds: number

  constructor(retryAfterSeconds: number, options?: ErrorOptions) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
    assignCause(this, options)
  }
}
