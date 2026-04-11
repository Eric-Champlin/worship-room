/**
 * BB-32 — Client-side token-bucket rate limiter.
 *
 * In-memory only, per-tab, per-feature. Each AI feature (`explain`,
 * `reflect`) has its own bucket that starts full and refills at a fixed
 * rate. Empty bucket → request denied with a typed decision carrying
 * `retryAfterSeconds`.
 *
 * Rate-limit state is NOT persisted. Reloading the page, opening a new
 * tab, or restarting the browser gives the user a fresh budget. This is
 * by design — the limiter is courtesy (protects against accidental
 * bursts and dev-tools loops) not security. Real safety requires a
 * backend proxy — Phase 3 work. See the spec § "What BB-32 explicitly
 * does NOT protect against" for the full threat-model discussion.
 *
 * The refill is computed on-demand inside `consumeRateLimitToken` and
 * `getRateLimitState`. There is no background `setInterval`.
 */

export const RATE_LIMIT_BUCKET_SIZE = 10
export const RATE_LIMIT_REFILL_PER_MINUTE = 10

/**
 * Milliseconds between token refills — 6000ms for the default settings.
 * Derived from the two exported constants so future tuning requires only
 * one edit.
 */
const REFILL_INTERVAL_MS = (60 * 1000) / RATE_LIMIT_REFILL_PER_MINUTE

export type AIFeature = 'explain' | 'reflect'

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

interface Bucket {
  tokens: number
  lastRefillAt: number
}

const buckets: Record<AIFeature, Bucket> = {
  explain: { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: Date.now() },
  reflect: { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: Date.now() },
}

/**
 * Refill a bucket based on elapsed time since its last refill. Only
 * advances `lastRefillAt` by the time corresponding to whole tokens added —
 * sub-6-second partial progress is preserved in the timestamp so the
 * fractional window is not lost on the next call.
 *
 * Clock-skew safety: if `Date.now()` goes backwards (e.g., user changed
 * system clock, or NTP adjustment), the refill is a no-op. Tokens are
 * never removed by a refill, only added.
 */
function refill(bucket: Bucket): void {
  const now = Date.now()
  const elapsedMs = now - bucket.lastRefillAt
  if (elapsedMs <= 0) return // clock skew or simultaneous call
  const tokensToAdd = Math.floor(elapsedMs / REFILL_INTERVAL_MS)
  if (tokensToAdd <= 0) return // less than one interval — leave lastRefillAt alone
  bucket.tokens = Math.min(RATE_LIMIT_BUCKET_SIZE, bucket.tokens + tokensToAdd)
  // Advance by exactly the consumed time so fractional accumulation is
  // preserved for the next call.
  bucket.lastRefillAt += tokensToAdd * REFILL_INTERVAL_MS
}

/**
 * Attempt to consume one token from the feature's bucket. Returns an
 * `{allowed: true}` decision on success (and decrements the bucket) or an
 * `{allowed: false, retryAfterSeconds}` decision on denial (bucket
 * unchanged).
 *
 * `retryAfterSeconds` is the wall-clock seconds until the next token
 * would refill, rounded up to at least 1. The caller surfaces this in a
 * `RateLimitError` which the UI renders as a live countdown.
 */
export function consumeRateLimitToken(feature: AIFeature): RateLimitDecision {
  const bucket = buckets[feature]
  refill(bucket)
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true }
  }
  const msSinceLastRefill = Date.now() - bucket.lastRefillAt
  const msUntilNextToken = REFILL_INTERVAL_MS - msSinceLastRefill
  const retryAfterSeconds = Math.max(1, Math.ceil(msUntilNextToken / 1000))
  return { allowed: false, retryAfterSeconds }
}

/**
 * Read-only inspector for tests and debugging. Does not consume a token.
 * Triggers a refill so the returned `tokensRemaining` is accurate for
 * "right now".
 */
export function getRateLimitState(feature: AIFeature): {
  tokensRemaining: number
  nextRefillInSeconds: number
} {
  const bucket = buckets[feature]
  refill(bucket)
  const msSinceLastRefill = Date.now() - bucket.lastRefillAt
  const msUntilNextToken = REFILL_INTERVAL_MS - msSinceLastRefill
  return {
    tokensRemaining: bucket.tokens,
    nextRefillInSeconds: Math.max(0, Math.ceil(msUntilNextToken / 1000)),
  }
}

/**
 * Test-only escape hatch. Restores both buckets to full with `lastRefillAt`
 * set to "now". Callers (vitest `beforeEach`) use this to ensure tests
 * start from a clean budget. Never called from production code.
 */
export function resetRateLimitForTests(): void {
  const now = Date.now()
  buckets.explain = { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: now }
  buckets.reflect = { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: now }
}
