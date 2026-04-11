# BB-32: AI Caching and Client-Side Rate Limiting

**Master Plan Reference:** N/A — bridge spec in the Bible-redesign wave (BB-30 → BB-31 → BB-32)

**Branch:** `bible-redesign` (stay on current branch — no new branch, no merge)

**Depends on:**
- BB-30 (Explain this passage — shipped) — provides `generateExplanation` and the Gemini client infrastructure
- BB-31 (Reflect on this passage — shipped) — provides `generateReflection` and validates the parallel-component pattern
- The Gemini client at `frontend/src/lib/ai/geminiClient.ts` and its lazy-initialized SDK singleton

**Hands off to:**
- A future Phase 3 backend proxy spec that will replace BB-32's client-side caching and rate limiting with real server-side enforcement
- Any future AI feature spec that wants to safely add caching to its requests without re-implementing the cache layer
- A future Ask AI migration spec — which is BLOCKED on the Phase 3 backend proxy and **not** unblocked by BB-32 alone

---

## Overview

BB-32 adds a client-side caching layer and a client-side rate-limiting layer between the existing AI feature hooks (`useExplainPassage`, `useReflectOnPassage`) and the Gemini client functions (`generateExplanation`, `generateReflection`). The cache reduces redundant API calls when users re-tap the same passage. The rate limit prevents accidental request bursts from a single browser session.

This is infrastructure work, not user-facing feature work. After BB-32 ships, the Explain and Reflect features behave identically from the user's perspective in all normal scenarios. The differences only manifest in three edge cases:

1. Tapping the same passage twice in a row returns the cached result immediately (no spinner, no API call).
2. Tapping many different passages in rapid succession triggers a brief rate-limit message with a live countdown.
3. Clearing localStorage manually resets the cache.

This makes BB-30 and BB-31 cheaper to operate and more pleasant to use without waiting for the Phase 3 backend.

## User Story

As a **logged-out or logged-in visitor reading the Bible**, I want repeated explanations and reflections on the same passage to appear instantly, and I want a friendly slowdown if I'm tapping faster than the AI helper can keep up — so that the experience feels fast, polite, and predictable rather than wasteful or laggy.

## Why this matters and what BB-32 explicitly does NOT cover

BB-32 makes BB-30 and BB-31 cheaper and more pleasant. It does **not** make them safe to expose on un-gated public surfaces. The distinction matters because BB-32 is the prerequisite people often think unblocks the Ask AI migration, and it doesn't.

**What BB-32 actually protects against:**

- **Wasted regeneration of identical content for the same user.** Tapping "Explain this passage" on John 3:16, walking away for an hour, and tapping it again returns the previous explanation instead of firing a fresh Gemini request.
- **Accidental request bursts from a single tab.** Rapidly tapping "Reflect on this passage" on twenty different verses in twenty seconds triggers a polite "slow down" message after the limit.
- **Browser-session-level finger-tremble or curious-user exploration.** A `for` loop in dev tools that calls the AI hook a thousand times in a second hits the rate limit after the first few requests and the rest are rejected client-side without ever leaving the browser.

**What BB-32 explicitly does NOT protect against and is not designed to:**

- **Multi-tab abuse.** Twenty tabs get twenty separate rate-limit budgets — the limiter is in-memory per tab. (The cache *is* shared across tabs via localStorage; the rate limiter is not.)
- **Multi-session abuse.** Clearing localStorage, refreshing, or opening incognito gives a fresh budget. The limiter is honor-system, not enforced.
- **Bot scraping.** Bots calling Gemini directly via `fetch` bypass the React layer entirely. The rate limiter only fires inside React hooks.
- **Coordinated abuse.** Many users coordinating from different sessions can collectively burn through the Gemini quota. BB-32 has no cross-user awareness.
- **Quota exhaustion.** BB-32 does not query or enforce the actual Gemini quota.
- **Cost runaway.** Per-tab limiting is not enough to guarantee bounded spend. The Google Cloud billing alert is the actual safety net.

**Mental model:** BB-32 is **cache + courtesy**. It makes the existing AI features faster and more polite. It does not make them safe in any meaningful security sense. Real safety requires a backend proxy (server-side rate limits, session validation, IP throttling) — Phase 3 work.

**Critical implication for the Ask AI migration:** BB-32 is NOT sufficient protection to enable Ask AI on the home page. Ask AI is a public, ungated, free-text AI surface — exactly the kind of surface that needs server-side rate limiting and bot protection. The Ask AI migration remains blocked on the Phase 3 backend, **not** on BB-32.

## Architecture: cache layer and rate-limit layer as wrappers

BB-32 adds two new modules under `frontend/src/lib/ai/` and modifies `geminiClient.ts` to route requests through them. The existing public API of the Gemini client (`generateExplanation`, `generateReflection`) does not change — callers continue to import the same functions and call them with the same arguments. The cache and rate-limit layers are internal to the client.

### The cache layer — `frontend/src/lib/ai/cache.ts`

Standalone, framework-agnostic. No React, no Vite-specific code, no SDK imports — pure TypeScript wrapping localStorage with TTL and version handling.

**What gets cached:** the full result of a Gemini call, keyed on a combination of feature name, model, reference, and verse text.

**Storage backend:** `localStorage`, with graceful fallback to no-op behavior when localStorage is unavailable (private browsing, quota exceeded, disabled). All operations wrapped in try/catch — cache failures never propagate to the UI.

**TTL:** **7 days** for both Explain and Reflect. Rationale: scriptural content doesn't change, the model doesn't change, the prompt doesn't change. Seven days captures all reasonable re-engagement patterns and short enough to ensure prompt updates eventually reach all users without manual purges.

**Cache size cap:** **2 MB** total for AI cache entries (out of the 5–10 MB localStorage origin quota). The cache module tracks total storage usage and evicts oldest entries (LRU-ish, based on creation timestamp) when the limit is exceeded. Soft limit enforced via eviction, not a hard reject.

**Cache versioning:** the cache module includes a version number in its key prefix (e.g., `bb32-v1:explain:...`). Future specs can bump the version to invalidate all entries. Orphaned entries (different version prefix) are cleaned up by `clearExpiredAICache()`.

**What does NOT get cached:** error results. Network errors, API errors, safety blocks, timeouts, key-missing — none cached. Retrying after a transient failure should fire a fresh request. Caching errors would create a frustrating UX where one bad network moment blocks the passage for 7 days.

**Exports:**

- `getCachedAIResult(feature: 'explain' | 'reflect', reference: string, verseText: string): CachedResult | null`
- `setCachedAIResult(feature: 'explain' | 'reflect', reference: string, verseText: string, value: { content: string, model: string }): void` — uses the default 7-day TTL
- `clearExpiredAICache(): number` — sweeps expired and version-mismatched entries; returns the count cleared
- `clearAllAICache(): void` — nukes all BB-32 entries (used by tests; reserved for a future admin button)
- `getAICacheStorageBytes(): number` — current cache size in bytes (used for cap enforcement and tests)

**Internal helpers (not exported):**

- `buildCacheKey(feature, reference, verseText)`
- `hashString(input)` — short, fast, non-cryptographic hash (DJB2 or similar) for the verse-text portion of the key
- `evictOldestUntilUnderLimit(maxBytes)`
- `safeLocalStorageGet/Set/Remove`

**Cache key format:**

```
bb32-v1:<feature>:<model>:<reference>:<verseTextHash>
```

Example:

```
bb32-v1:explain:gemini-2.5-flash-lite:1-corinthians-13:4-7:abc123def
```

The version prefix `bb32-v1` allows future invalidation. The feature name namespaces Explain and Reflect entries. The model name ensures that switching models in a future spec doesn't return stale results. The reference is human-readable for debugging. The verse-text hash captures content changes (e.g., if WEB translation files are updated).

**Storage value format:**

```json
{
  "v": 1,
  "feature": "explain",
  "model": "gemini-2.5-flash-lite",
  "reference": "1 Corinthians 13:4-7",
  "content": "...the full Gemini-generated explanation text...",
  "createdAt": 1744300000000
}
```

The `v` field is the entry schema version (independent of the cache key version). `createdAt` is Unix epoch milliseconds. TTL check: `now - createdAt > 7 * 24 * 60 * 60 * 1000`.

### The rate-limit layer — `frontend/src/lib/ai/rateLimit.ts`

Standalone token-bucket rate limiter. No React, no localStorage, no SDK imports — pure in-memory state.

**Algorithm:** classic token-bucket. Each AI feature has its own bucket starting full. Each request consumes 1 token. Tokens refill at a fixed rate. Empty bucket → request rejected with a typed `RateLimitError`.

**Bucket parameters:**

- **Bucket size:** 10 tokens (`RATE_LIMIT_BUCKET_SIZE`)
- **Refill rate:** 10 tokens per minute, i.e. 1 token every 6 seconds (`RATE_LIMIT_REFILL_PER_MINUTE`)

This allows a 10-request burst, then throttles to ~1 request per 6 seconds, with the bucket fully refilling after a minute of inactivity. Tuned for normal exploratory use: smooth for curious users, hits rate limit within seconds for scripted abuse.

The bucket parameters are exported as constants so they can be tuned in a future spec without restructuring the code. They are NOT user-configurable and are NOT exposed as environment variables.

**Storage backend:** in-memory only. Does NOT persist across page reloads or tab closes. Persisting across sessions would require localStorage and would create a frustrating UX where reloading still leaves a user rate-limited. Tradeoff: a user can bypass the limit by reloading. Acceptable, given BB-32 is courtesy not security.

**Per-feature buckets:** Explain and Reflect have separate buckets. Hitting the Explain limit does not block Reflect (and vice versa).

**Exports:**

- `consumeRateLimitToken(feature: 'explain' | 'reflect'): { allowed: true } | { allowed: false, retryAfterSeconds: number }`
- `getRateLimitState(feature: 'explain' | 'reflect'): { tokensRemaining: number, nextRefillInSeconds: number }` — read-only inspector for tests and debugging
- `resetRateLimitForTests(): void` — test-only escape hatch
- `RATE_LIMIT_BUCKET_SIZE` — exported constant, value 10
- `RATE_LIMIT_REFILL_PER_MINUTE` — exported constant, value 10

**Internal state:**

```ts
const buckets = {
  explain: { tokens: 10, lastRefillAt: Date.now() },
  reflect: { tokens: 10, lastRefillAt: Date.now() },
}
```

**Refill math:**

```
elapsedMs = now - bucket.lastRefillAt
elapsedMinutes = elapsedMs / 60000
tokensToAdd = floor(elapsedMinutes * RATE_LIMIT_REFILL_PER_MINUTE)
bucket.tokens = min(BUCKET_SIZE, bucket.tokens + tokensToAdd)
// Only update lastRefillAt when tokens are added — preserves fractional accumulation between calls.
```

### `frontend/src/lib/ai/errors.ts` — additions

Add one new error class alongside the existing five:

```ts
export class RateLimitError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number, options?: { cause?: unknown }) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`, options)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
```

This is the only new field added to any error class in BB-32. The existing five (`GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `GeminiKeyMissingError`) are NOT modified.

### `frontend/src/lib/ai/geminiClient.ts` — modifications

Modify both `generateExplanation` and `generateReflection` to add the cache check at the top and the rate-limit check before the SDK call. The two functions become structurally similar — both grow the same wrapper logic — and this is the right time to extract the shared private helper that BB-31 deferred.

**The new shared helper signature:**

```ts
async function generateWithPromptAndCacheAndRateLimit(
  feature: 'explain' | 'reflect',
  systemPrompt: string,
  reference: string,
  verseText: string,
  buildUserPrompt: (ref: string, text: string) => string,
): Promise<{ content: string, model: string }>
```

**The helper does:**

1. Cache lookup via `getCachedAIResult(feature, reference, verseText)`. Return cached result if present. **No rate-limit consumption, no API call.**
2. Rate-limit check via `consumeRateLimitToken(feature)`. Throw `RateLimitError` with `retryAfterSeconds` if denied.
3. Get the lazy SDK client via the existing `getClient()`.
4. Build the user prompt via the passed `buildUserPrompt` function.
5. Call `ai.models.generateContent` with the same config as before (system instruction routing, abort signal, temperature, max tokens).
6. Map SDK errors to typed errors as before (network, API, safety, timeout).
7. Validate the response (safety-block detection across the three paths).
8. Trim and validate the result.
9. Store in cache via `setCachedAIResult(feature, reference, verseText, result)`.
10. Return the result.

After extraction, `generateExplanation` and `generateReflection` become thin wrappers that pass their feature name and prompt to the helper.

**Behavior preservation rule (non-negotiable):** every existing test in `geminiClient.test.ts` (43 total — 23 BB-30 explain tests, 20 BB-31 reflect tests) must continue to pass without modification. The helper extraction is purely structural; it must not change observable behavior except in the documented new ways (cache hits, rate-limit errors).

**Fallback rule:** if during execution the helper extraction would require modifying any existing test, the helper extraction MUST be abandoned and `generateExplanation` and `generateReflection` should be modified in place with duplicated cache and rate-limit logic. Behavior preservation > code cleanliness.

### How the layers compose

When `generateExplanation` is called, the new flow is:

1. Build the cache key from the reference and verse text.
2. **Check the cache. If a non-expired entry exists, return it immediately. No rate-limit consumption, no API call. This is the most important behavior of BB-32 — repeated requests are free.**
3. If no cache hit, check the rate limiter for the Explain bucket. If the bucket is empty, throw `RateLimitError` with `retryAfterSeconds`.
4. If the rate limit allows, call the Gemini SDK as before.
5. On success, store the result in the cache with a 7-day TTL. Return the result.
6. On failure, do NOT cache the failure. Throw the typed error as before.

`generateReflection` follows the same flow with the Reflect bucket and a different cache-key prefix.

### What does NOT change

- Public function signatures of `generateExplanation` and `generateReflection`.
- The five existing error classes thrown by them.
- Lazy SDK initialization, system-instruction routing, `AbortSignal.timeout` enforcement, safety-block detection.
- The hooks (`useExplainPassage`, `useReflectOnPassage`) — modified only to handle the new `RateLimitError` in their classify function.
- The sub-view structure (`ExplainSubView`, `ReflectSubView`).
- The prompt files (`explainPassagePrompt.ts`, `reflectPassagePrompt.ts`).
- The verse action sheet, the registry, the Bible reader.

## The hooks update

Modify `useExplainPassage` and `useReflectOnPassage` to handle `RateLimitError`. Minimal change: add a new error kind `'rate-limit'` to `ExplainErrorKind` (and equivalent for Reflect), add a new entry to `ERROR_COPY`, and add an `instanceof RateLimitError` check to `classifyError`.

**New error copy:**

```
'rate-limit': "You're going faster than our AI helper can keep up. Try again in {seconds} seconds."
```

`{seconds}` is interpolated from `error.retryAfterSeconds`.

**Hook state shape addition:**

```ts
export interface ExplainState {
  status: 'loading' | 'success' | 'error'
  result: ExplainResult | null
  errorKind: ExplainErrorKind | null
  errorMessage: string | null
  retryAfterSeconds: number | null  // NEW — only set when errorKind is 'rate-limit'
}
```

`retryAfterSeconds` is null for all error kinds except `'rate-limit'`. The same changes apply to `useReflectOnPassage` mirror-image.

## The UI surface — `ExplainSubViewError.tsx`

Minimal changes. The component currently takes `kind`, `message`, and `onRetry`. Add an optional `retryAfterSeconds` prop.

**When `kind === 'rate-limit'` and `retryAfterSeconds` is present:**

- Render a live countdown ("Try again in 8 seconds... 7... 6...")
- Countdown implemented entirely within the component via a `useEffect` that decrements a local state value every second
- When the countdown reaches zero, the message switches to standard "Try again" copy and the retry button becomes active

**Disabled-button visual treatment during countdown:**

- `disabled:opacity-40 disabled:cursor-not-allowed` Tailwind classes
- `aria-disabled="true"`
- Click handler is a no-op while disabled
- This is the standard disabled-button pattern from `09-design-system.md` § Buttons

`ReflectSubView` reuses `ExplainSubViewError` and inherits the new behavior with no separate change.

## Cache hit UX

The most important UX change in BB-32 is the cache hit. When a user re-taps the same passage they previously viewed, the explanation should appear **instantly**.

**Implementation:** the hook's `useEffect` that fires on mount currently sets `status: 'loading'` and then awaits the Gemini call. With BB-32, the cache check happens inside `generateExplanation` (or `generateReflection`) which is called from inside the hook's effect. The cache check is synchronous (localStorage is sync) but is wrapped in an async function, so the cached result returns through the same `.then` callback as a real result — just much faster.

**Visible UX:** for a cached entry, the loading state appears for one render frame (essentially imperceptible) and then immediately switches to the success state. Acceptable.

**Escape hatch:** if during execution the one-frame loading flash is visually noticeable, the plan phase may propose a synchronous pre-check inside the hook that sets initial state to `'success'` for cache hits — acceptable as long as it doesn't break any existing tests.

## Auth Gating

BB-32 introduces zero new auth gates. Same posture as BB-30 and BB-31.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|---------------------|--------------------|--------------------|
| Trigger Explain on a verse (cache hit) | Instant cached result, no spinner | Instant cached result, no spinner | N/A — no gate |
| Trigger Explain on a verse (cache miss, within rate limit) | Calls Gemini, returns result | Calls Gemini, returns result | N/A — no gate |
| Trigger Explain on a verse (rate-limited) | Sees `RateLimitError` UI with countdown | Sees `RateLimitError` UI with countdown | N/A — no gate |
| Trigger Reflect on a verse (any state) | Same as Explain, against the Reflect bucket | Same as Explain, against the Reflect bucket | N/A — no gate |
| Press the in-component retry button while countdown is active | No-op (button visually disabled) | No-op (button visually disabled) | N/A — no gate |
| Press the in-component retry button after countdown reaches zero | Re-fires the request through the same flow | Re-fires the request through the same flow | N/A — no gate |

**Logged-out users are subject to the same caching and rate limiting as logged-in users.** Cache entries written by logged-out browsing persist in localStorage and are reused after sign-in. Rate-limit buckets are per-tab and identical for both states.

## Responsive Behavior

BB-32 introduces no new layouts. Only the existing `ExplainSubViewError` component changes, and only by adding a countdown line and a disabled-button visual state. The existing component is already responsive across all breakpoints (BB-30/BB-31).

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Error card stacks as in BB-30/BB-31. Countdown line wraps naturally below the error message; retry button remains full-width-friendly. |
| Tablet (640–1024px) | Inherits BB-30/BB-31 layout. No changes. |
| Desktop (> 1024px) | Inherits BB-30/BB-31 layout. No changes. |

**Touch targets:** the retry button retains its existing 44px minimum tap target. The disabled visual state must not change the button's hit-box size — only its opacity and pointer cursor.

**Reduced motion:** the per-second countdown decrement is a content update, not an animation. It is not gated by `prefers-reduced-motion` and does not need to be — there is no transition, fade, or movement involved.

## AI Safety Considerations

BB-32 does not change any AI safety behavior of BB-30 or BB-31:

- Disclaimer text, system prompts, scholar-not-pastor framing, interrogative-mood reflection — all unchanged
- Crisis keyword handling for free-text user input — N/A here, this spec processes only verse references and verse text from the WEB Bible (not user-typed free text)
- Safety-block detection in the SDK response — fully preserved by the helper extraction (acceptance criteria 21–22)
- AI-generated content rendering — already plain-text only via existing BB-30/BB-31 components, unchanged

The cache stores AI-generated content locally in the user's browser. Same threat model as the user's browser history — i.e. trusted-device assumption. No encryption, no compression. Acceptable because the cached content is the same content the user has already seen and can re-fetch on demand.

## Auth & Persistence

- **Logged-out users:** Cache entries written to localStorage under `bb32-v1:*` keys. Rate-limit state in-memory only, lost on reload. Same posture as BB-30 cached drafts — local-only, not synced anywhere.
- **Logged-in users:** Same behavior. BB-32 has no concept of user identity — cache is per-browser, rate limit is per-tab.
- **localStorage usage:**
  - Key prefix: `bb32-v1:` (note: this prefix does **not** use the project-standard `wr_` prefix because BB-32 entries are namespaced as a self-contained pool managed by the cache module's eviction and version logic — same exception precedent as the `bible:` prefix used by other Bible-redesign storage)
  - Total cap: 2 MB across all `bb32-v1:*` entries
  - TTL: 7 days per entry
  - Cleanup: `clearExpiredAICache()` sweeps expired and version-mismatched entries

**11-local-storage-keys.md update required:** add a new "AI Cache" section listing the `bb32-v1:*` key family, the value shape (`{v, feature, model, reference, content, createdAt}`), the 7-day TTL, and the 2 MB cap. This is the only documentation file BB-32 must update.

## Completion & Navigation

N/A — BB-32 is infrastructure under existing features. It does not interact with the Daily Hub completion system, does not produce CTAs, does not pass context to other tabs.

## Design Notes

- BB-32 introduces no new visual patterns. The only UI change is to the existing `ExplainSubViewError` component, which already follows the design system patterns from `09-design-system.md`.
- Disabled button treatment must use the standard pattern from `09-design-system.md` § Buttons: `disabled:opacity-40 disabled:cursor-not-allowed` plus `aria-disabled="true"`.
- The countdown text must use the same typography as the existing error message in `ExplainSubViewError` — no new font, no new color, no new spacing.
- **Zero new visual patterns.** No `[UNVERIFIED]` markers needed during planning.

## Out of Scope

- **No backend.** Pure client-side implementation.
- **No server-side rate limiting.** Bypassable by reloading or opening a new tab.
- **No cross-tab rate limiting.** Each tab has its own bucket.
- **No cross-user awareness.** Cache is per-browser, rate limit is per-tab.
- **No quota tracking.** BB-32 does not query Gemini's actual quota state.
- **No cost tracking.** BB-32 does not track or display API spending.
- **No cache invalidation API.** Cache entries expire by TTL only. No UI button or programmatic user-facing way to invalidate.
- **No migration of the Ask AI page.** Remains blocked on a real backend proxy regardless of BB-32.
- **No telemetry.** No logging of cache hits, cache misses, or rate-limit hits.
- **No new auth gates.** Zero, same as BB-30/BB-31.
- **No new SDK installs.** Reuses everything BB-30/BB-31 installed.
- **No changes to the Gemini client's public function signatures.**
- **No changes to the prompts** (`explainPassagePrompt.ts`, `reflectPassagePrompt.ts`).
- **No changes to the sub-view structure.** Only the error component gets the new prop and countdown UX.
- **No changes to BB-30 or BB-31 tests.** All 261 existing tests must continue to pass unchanged.
- **No prompt testing.** BB-32 changes infrastructure, not prompt content.
- **No persistence of rate-limit state.** Reload clears the bucket.
- **No graceful cache warming or prefetching.** New users start with an empty cache.
- **No multi-key cache lookups.** Each request has exactly one cache key, no fuzzy matching.
- **No compression.** Plain JSON in the 2 MB cap.
- **No encryption.** Trusted-device assumption.
- **No "clear cache" button** in the UI.
- **Pre-existing failing tests are NOT touched.**

## Acceptance Criteria

- [ ] 1. The cache module at `frontend/src/lib/ai/cache.ts` exposes `getCachedAIResult`, `setCachedAIResult`, `clearExpiredAICache`, `clearAllAICache`, and `getAICacheStorageBytes`
- [ ] 2. The cache module uses localStorage with graceful fallback to no-op behavior when localStorage is unavailable
- [ ] 3. Cache keys follow the format `bb32-v1:<feature>:<model>:<reference>:<verseTextHash>`
- [ ] 4. Cache entries have a 7-day TTL
- [ ] 5. Cache enforces a 2 MB total size cap with LRU-ish eviction of oldest entries
- [ ] 6. The cache module is fully unit-tested with at least **25 tests** covering get/set, expiration, version mismatch, eviction, and localStorage failure
- [ ] 7. The rate-limit module at `frontend/src/lib/ai/rateLimit.ts` exposes `consumeRateLimitToken`, `getRateLimitState`, `resetRateLimitForTests`, and the bucket-size constants
- [ ] 8. The rate limiter uses a token-bucket algorithm with bucket size 10 and refill rate 10 tokens per minute
- [ ] 9. Each AI feature (`explain`, `reflect`) has its own bucket
- [ ] 10. Rate-limiter state is in-memory only and does not persist across page reloads
- [ ] 11. The rate-limit module is fully unit-tested with at least **15 tests** covering token consumption, refill behavior, per-feature isolation, and edge cases (clock skew, fractional refill)
- [ ] 12. A new `RateLimitError` class is added to `frontend/src/lib/ai/errors.ts`
- [ ] 13. `RateLimitError` includes a `retryAfterSeconds` field
- [ ] 14. The existing five typed error classes (`GeminiNetworkError`, `GeminiApiError`, `GeminiSafetyBlockError`, `GeminiTimeoutError`, `GeminiKeyMissingError`) are NOT modified
- [ ] 15. `frontend/src/lib/ai/geminiClient.ts` is modified to call cache and rate-limit layers in the new `generateWithPromptAndCacheAndRateLimit` private helper (or, if behavior preservation requires it, the logic is inlined into both functions with code duplication)
- [ ] 16. `generateExplanation` and `generateReflection` keep their public function signatures unchanged
- [ ] 17. Cache hits return immediately without consuming a rate-limit token
- [ ] 18. Cache hits do not fire any Gemini API call
- [ ] 19. Rate-limit denials throw `RateLimitError` before any Gemini API call fires
- [ ] 20. Errors from Gemini are NOT cached (only successful results are cached)
- [ ] 21. All **23 existing BB-30** `generateExplanation` tests pass unchanged
- [ ] 22. All **20 existing BB-31** `generateReflection` tests pass unchanged
- [ ] 23. New tests are added for `generateWithPromptAndCacheAndRateLimit` covering cache hits, cache misses, rate-limit denials, and the integration of cache + rate limit + Gemini call
- [ ] 24. `useExplainPassage` and `useReflectOnPassage` hooks add a new `'rate-limit'` error kind
- [ ] 25. The hooks expose `retryAfterSeconds` in their state when the error kind is `'rate-limit'`
- [ ] 26. All **31 existing BB-30/BB-31** hook tests pass unchanged
- [ ] 27. New hook tests verify the rate-limit error path
- [ ] 28. `ExplainSubViewError.tsx` accepts an optional `retryAfterSeconds` prop
- [ ] 29. When `kind === 'rate-limit'` and `retryAfterSeconds` is present, the error message displays a live countdown
- [ ] 30. The retry button is visually disabled (lower opacity, `aria-disabled`) during the countdown and becomes active when the countdown reaches zero
- [ ] 31. The countdown UI is implemented entirely within the error component using a local `useEffect`
- [ ] 32. The disclaimer components, the loading components, the success state, and all sub-view structure are NOT modified
- [ ] 33. The verse action sheet, the registry, the Bible reader, the prompts, and the SDK initialization code are NOT modified
- [ ] 34. All **261 BB-30 and BB-31 tests** continue to pass unchanged
- [ ] 35. New tests for BB-32 modules and updated components total at least **60** (25 cache + 15 rate limit + 5 RateLimitError + 5 helper integration + 5 hook updates + 5 component updates)
- [ ] 36. Logged-out users are subject to the same caching and rate limiting as logged-in users (zero auth gates, same posture as BB-30/BB-31)
- [ ] 37. Cache failures (localStorage quota exceeded, etc.) do not break the AI features — they degrade silently to no-cache behavior
- [ ] 38. Rate-limit denial copy mentions a specific number of seconds, not just "rate limited"
- [ ] 39. Zero raw hex values
- [ ] 40. Pre-existing failing tests are NOT touched
- [ ] 41. A user tapping the same passage twice in a row sees the second result instantly (cache hit) with no loading spinner appearing for more than one render frame
- [ ] 42. A user tapping 11 different passages in rapid succession sees the 11th request hit the rate limit with a "Try again in N seconds" message
- [ ] 43. A user who waits 60 seconds after hitting the rate limit can fire requests again normally
- [ ] 44. The `Explain` rate limit and the `Reflect` rate limit are independent — hitting one does not block the other
- [ ] 45. Cache key collisions verified: the 8 BB-31 prompt-test passages plus the 8 BB-30 prompt-test passages produce **16 unique keys** (zero collisions)
- [ ] 46. `11-local-storage-keys.md` is updated to include the `bb32-v1:*` AI cache key family

## Notes for execution

- **The refactor extraction of `generateWithPromptAndCacheAndRateLimit` is the highest-risk part of this spec.** The existing 43 tests for `generateExplanation` and `generateReflection` are the contract. If the refactor breaks any of them, the refactor must be abandoned and the cache + rate-limit logic must be inlined into both functions with code duplication. Behavior preservation > code cleanliness.
- **Cache key collisions are silent failures.** If two different requests produce the same cache key, the second request gets the first request's cached result. DJB2 or similar is fine; cryptographic hashes are overkill. Test with the 16 prompt-test passages from BB-30 and BB-31 to verify zero collisions (acceptance criterion 45).
- **The 7-day TTL is a default, not a contract.** Future specs can change it without breaking anything as long as the cache key version is bumped. Document the TTL constant clearly.
- **The 2 MB size cap is a soft limit enforced via eviction, not a hard reject.** When a `setCachedAIResult` call would exceed the cap, evict oldest entries until there's room, then write. If even after full eviction the new entry doesn't fit (extremely unlikely — would require a single AI response over 2 MB, which Flash-Lite cannot produce), the write silently fails and the function returns without error.
- **The rate-limit numbers (10 tokens, 10 per minute) are tuning, not architecture.** Future specs can change them by updating the constants. Document them clearly.
- **The countdown UI is the only user-visible change.** All other BB-32 changes are invisible until they fire. Take care that the countdown UX feels polished — a janky countdown is more noticeable than no countdown.
- **Do NOT add cache statistics, hit-rate logging, or any kind of telemetry.** BB-32 is silent by design. Use browser dev tools to inspect localStorage directly when debugging.
- **Do NOT add a "clear cache" button to the UI.** Out of scope.
- **Do NOT add cache warming, prefetching, or speculative loading.** BB-32 is reactive.
- **Do NOT migrate the Ask AI page in this spec.** Blocked on Phase 3 backend.
- **The pastoral safety properties of BB-30 and BB-31 are not affected by BB-32.** None of the prompt or framing changes; BB-32 only affects throttling and caching.
- **After BB-32 ships, the next Bible-wave specs are BB-33 through BB-37b.** BB-26 through BB-29 remain blocked on the FCBH API key. BB-32 is the capstone of the AI infrastructure work for the Bible wave.

---

## Pre-execution checklist (for CC, before /execute-plan)

Before CC runs `/execute-plan`, confirm these items:

1. BB-30 and BB-31 are shipped and committed. Both `generateExplanation` and `generateReflection` exist in `geminiClient.ts`. Both have test coverage. **PENDING CC verification.**
2. The 43 existing geminiClient tests pass cleanly on the current branch. **PENDING CC verification.**
3. The 261 total BB-30/BB-31 tests pass cleanly. **PENDING CC verification.**
4. `frontend/.env.local` contains a working `VITE_GEMINI_API_KEY`. Confirmed from BB-31 prompt testing.
5. The decision on whether to extract `generateWithPromptAndCacheAndRateLimit` as a shared helper or inline the new logic in both functions is deferred to the plan phase. CC should attempt the extraction first; if it cannot be done without modifying existing tests, fall back to inlining.
6. No new SDK packages are installed. BB-32 reuses everything BB-30/BB-31 installed.
7. **Stay on `bible-redesign` branch. No new branch, no merge.**

Items 1–3 are inherited from BB-30/BB-31 execution. Items 4–7 are configuration confirmations. No user action is required before `/execute-plan` can run.
