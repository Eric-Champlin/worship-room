# Implementation Plan: BB-32 — AI Caching and Client-Side Rate Limiting

**Spec:** `_specs/bb-32-ai-caching-and-rate-limiting.md`
**Date:** 2026-04-11
**Branch:** `bible-redesign` (no new branch, no merge — same as BB-30/BB-31)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — used for the disabled-button visual treatment only; BB-32 introduces no new visual patterns)
**Recon Report:** N/A — infrastructure-only spec
**Master Spec Plan:** N/A — bridge spec in the Bible-redesign wave

---

## Architecture Context

### Existing files this spec touches

**Modified:**
- `frontend/src/lib/ai/errors.ts` (1–121) — adds `RateLimitError` alongside the five existing typed errors. The five existing classes remain byte-unchanged.
- `frontend/src/lib/ai/geminiClient.ts` (1–326) — adds the cache + rate-limit wrapper helper and routes both `generateExplanation` and `generateReflection` through it. Public signatures, model constant, lazy SDK init, error mapping, and safety-block detection are preserved verbatim.
- `frontend/src/hooks/bible/useExplainPassage.ts` (1–146) — adds the `'rate-limit'` error kind, the `retryAfterSeconds` field on `ExplainState`, the new `ERROR_COPY` entry, and the `instanceof RateLimitError` check in `classifyError`.
- `frontend/src/hooks/bible/useReflectOnPassage.ts` (1–152) — same surgical additions, mirror-image of the explain hook.
- `frontend/src/components/bible/reader/ExplainSubViewError.tsx` (1–45) — adds optional `retryAfterSeconds` prop, internal `useEffect` countdown state, disabled button visual treatment when countdown is active. `ReflectSubView` reuses this component and inherits the change for free.
- `frontend/src/components/bible/reader/ExplainSubView.tsx` (40–116) — passes `state.retryAfterSeconds` from the hook into `ExplainSubViewError`.
- `frontend/src/components/bible/reader/ReflectSubView.tsx` — same prop pass-through addition.
- `.claude/rules/11-local-storage-keys.md` — adds the new "AI Cache" subsection documenting the `bb32-v1:*` key family.

**Created:**
- `frontend/src/lib/ai/cache.ts` — new module, framework-agnostic localStorage cache with TTL + version + LRU-ish eviction.
- `frontend/src/lib/ai/rateLimit.ts` — new module, in-memory token-bucket rate limiter with per-feature buckets.
- `frontend/src/lib/ai/__tests__/cache.test.ts` — ≥25 unit tests.
- `frontend/src/lib/ai/__tests__/rateLimit.test.ts` — ≥15 unit tests.
- `frontend/src/lib/ai/__tests__/errors.test.ts` already exists — APPENDED with ≥5 RateLimitError tests (do NOT rewrite the file from scratch).
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` already exists — APPENDED with ≥5 helper-integration tests covering cache hits, cache misses, rate-limit denials, and the cache-bypass-on-error rule. Existing 43 tests are NOT modified.
- `frontend/src/hooks/bible/__tests__/useExplainPassage.test.ts` already exists — APPENDED with ≥3 rate-limit error path tests. Existing 12 tests not modified.
- `frontend/src/hooks/bible/__tests__/useReflectOnPassage.test.ts` already exists — APPENDED with ≥3 rate-limit error path tests. Existing 15 tests not modified.
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewError.test.tsx` already exists — APPENDED with ≥5 countdown-UI tests. Existing 6 tests not modified.

### Existing patterns to follow

- **Lazy module-singleton pattern** — `geminiClient.ts:66-85` lazily memoizes the SDK client and exposes `__resetGeminiClientForTests()` for the test suite. The new `rateLimit.ts` module mirrors this with `resetRateLimitForTests()` (spec acceptance criterion 7).
- **Test mocking pattern** — `geminiClient.test.ts:5-19` uses `vi.hoisted()` to declare mocks ahead of `vi.mock()` calls so they're available inside the factory. New geminiClient helper-integration tests must follow this pattern. Cache tests will mock `localStorage` via a manual stub on `globalThis`. Rate-limit tests will mock `Date.now()` via `vi.useFakeTimers()` + `vi.setSystemTime()`.
- **AbortSignal composition** — `geminiClient.ts:130-132` composes the caller's signal with `AbortSignal.timeout(REQUEST_TIMEOUT_MS)` via `AbortSignal.any`. The helper extraction must preserve this exactly.
- **Error classification in hooks** — `useExplainPassage.ts:39-48` uses `instanceof` checks ordered most-specific first. The new `'rate-limit'` check goes BEFORE `GeminiApiError` (which is the catch-all) but at the top so it cannot be misclassified. New entry: `if (err instanceof RateLimitError) return 'rate-limit'`.
- **`queueMicrotask` deferral** — `useExplainPassage.ts:107-134` defers the `generateExplanation` call by one microtask tick to make StrictMode's mount-unmount-mount loop abort cleanly without firing the request. The hook does NOT need to change this — cache hits resolve through the same `.then` callback.
- **Sub-view rendering** — `ExplainSubView.tsx:90-101` already passes `kind`, `message`, `onRetry` to `ExplainSubViewError`. Adding `retryAfterSeconds={state.retryAfterSeconds ?? undefined}` is a one-prop change.

### Test patterns to match

- **Vitest + RTL.** All tests use `describe`/`it`/`expect`. Async tests use `async` + `await` with `userEvent.setup()`. Vitest fake timers via `vi.useFakeTimers()` for time-dependent tests.
- **`__resetGeminiClientForTests()` in `beforeEach`** — necessary because the SDK client is module-memoized.
- **No provider wrapping needed** — none of the touched files use `AuthProvider`/`ToastProvider`/`AudioProvider`. The verse action sheet is a deeper integration test concern that BB-32 does not touch.
- **Behavior preservation hard rule (acceptance criteria 21–22, 26, 34):** every existing test in `geminiClient.test.ts` (43), `useExplainPassage.test.ts` (12), `useReflectOnPassage.test.ts` (15), and `ExplainSubViewError.test.tsx` (6) must continue to pass byte-unchanged. Plan steps that would break a pre-existing test must be re-planned, not rewritten the test.

### Auth gating patterns

**Zero new auth gates.** BB-32 introduces no `useAuth` / `useAuthModal` calls. Cache and rate-limit apply uniformly to logged-in and logged-out users (spec acceptance criterion 36). The new modules must NOT import `useAuth` or `useAuthModal`. The existing absence of auth gating in `useExplainPassage`, `useReflectOnPassage`, `ExplainSubView`, and `ReflectSubView` is preserved.

### Cross-spec data dependencies (none from a master plan)

BB-32 has no master plan. The shared data it produces is:

- A new exported `RateLimitError` class consumable by future hooks
- A new exported cache module that any future AI feature spec can import without re-implementing
- A new exported rate-limit module ditto
- Two new exported constants `RATE_LIMIT_BUCKET_SIZE` and `RATE_LIMIT_REFILL_PER_MINUTE` (tunable in future specs)

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Trigger Explain (cache hit) | No gate, instant return | N/A | None — spec § Auth Gating row 1 |
| Trigger Explain (cache miss) | No gate, calls Gemini | N/A | None — spec § Auth Gating row 2 |
| Trigger Explain (rate-limited) | No gate, shows countdown | N/A | None — spec § Auth Gating row 3 |
| Trigger Reflect (any state) | No gate, mirror of Explain | N/A | None — spec § Auth Gating row 4 |
| Press retry during countdown | No gate, button disabled | Step 7 | Component-level `disabled` attribute, no auth |
| Press retry after countdown | No gate, re-fires request | Step 7 | None |

**BB-32 introduces zero new auth gates. The plan adds zero `useAuth`/`useAuthModal` imports.** Verified by acceptance criterion 36.

---

## Design System Values (for UI step — Step 7 only)

**Disabled-button visual treatment** — only the retry button in `ExplainSubViewError` gains a new visual state. Source: `09-design-system.md` § Buttons (canonical disabled pattern).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Retry button (disabled during countdown) | opacity | `disabled:opacity-40` | 09-design-system.md, BB-32 spec § "The UI surface" |
| Retry button (disabled during countdown) | cursor | `disabled:cursor-not-allowed` | 09-design-system.md, BB-32 spec |
| Retry button (disabled during countdown) | aria | `aria-disabled="true"` (when disabled) | 09-design-system.md |
| Retry button (active state) | min-height | `min-h-[44px]` (UNCHANGED — preserved from existing test assertion `ExplainSubViewError.test.tsx:39`) | Existing component |
| Countdown text | className | `text-xs text-white/50` (matches existing `<p className="mt-1 max-w-xs text-xs text-white/50">{message}</p>` at `ExplainSubViewError.tsx:33`) | Existing component |

**Zero new visual patterns. Zero new colors. Zero new fonts. Zero new spacing values.** The countdown text reuses the exact typography of the existing error message line. The disabled button reuses the canonical Tailwind disabled pattern.

---

## Design System Reminder

(Displayed verbatim by `/execute-plan` Step 4d before Step 7 — the only UI-touching step.)

- BB-32 introduces ZERO new visual patterns. The only UI change is adding a countdown line and a disabled-button visual state to the existing `ExplainSubViewError` component.
- The countdown text MUST use the exact same className as the existing error message line: `mt-1 max-w-xs text-xs text-white/50`. No new font, no new color, no new spacing.
- The disabled retry button MUST use the canonical Tailwind disabled pattern: `disabled:opacity-40 disabled:cursor-not-allowed` plus `aria-disabled` set when disabled. The button's hit-box size MUST NOT change — only opacity and cursor. The `min-h-[44px]` class is required because `ExplainSubViewError.test.tsx:39` asserts it.
- The countdown is a content update, NOT an animation. No transition, no fade, no movement. `prefers-reduced-motion` does NOT need to be checked.
- DO NOT add any color, animation, glow, or border treatment to indicate the countdown state. The opacity drop on the button is the entire visual signal.
- The retry button's `data-error-kind` attribute MUST still be present and equal `kind` (preserved from `ExplainSubViewError.test.tsx:55`).
- The component MUST keep `role="alert"` and `aria-live="assertive"` unchanged (preserved from `ExplainSubViewError.test.tsx:31`).
- DO NOT use `useState` directly for the countdown — use `useState` + `useEffect` with `setInterval`, and clean the interval up on unmount (per spec § "ExplainSubViewError" countdown implementation).
- Worship Room uses `font-sans` Inter for body text. The countdown text inherits `text-xs` sizing from the existing error message — do NOT introduce a different font or size.
- DO NOT use any of the deprecated patterns from `09-design-system.md` § "Deprecated Patterns" (none of them apply to this surface anyway, but the executor should not invent new ones).

---

## Shared Data Models (BB-32 produces; no master plan to consume)

```typescript
// frontend/src/lib/ai/cache.ts (NEW EXPORTS)

export type AIFeature = 'explain' | 'reflect'

export interface CachedResult {
  content: string
  model: string
}

export function getCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
): CachedResult | null

export function setCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
  value: CachedResult,
): void

export function clearExpiredAICache(): number

export function clearAllAICache(): void

export function getAICacheStorageBytes(): number

// Cache key format: bb32-v1:<feature>:<model>:<reference>:<verseTextHash>
// Storage value: { v: 1, feature, model, reference, content, createdAt }
// TTL: 7 days
// Total cap: 2 MB
// Model: "gemini-2.5-flash-lite" (the constant from geminiClient.ts:34, NOT re-exported — passed as part of CachedResult.model)
```

```typescript
// frontend/src/lib/ai/rateLimit.ts (NEW EXPORTS)

export const RATE_LIMIT_BUCKET_SIZE = 10
export const RATE_LIMIT_REFILL_PER_MINUTE = 10

export type AIFeature = 'explain' | 'reflect'

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export function consumeRateLimitToken(feature: AIFeature): RateLimitDecision

export function getRateLimitState(feature: AIFeature): {
  tokensRemaining: number
  nextRefillInSeconds: number
}

export function resetRateLimitForTests(): void
```

```typescript
// frontend/src/lib/ai/errors.ts (APPENDED — five existing classes UNCHANGED)

export class RateLimitError extends Error {
  retryAfterSeconds: number
  constructor(retryAfterSeconds: number, options?: ErrorOptions) {
    super(`Too many requests. Try again in ${retryAfterSeconds} seconds.`)
    this.name = 'RateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
    assignCause(this, options)
  }
}
```

```typescript
// frontend/src/hooks/bible/useExplainPassage.ts (MODIFIED)

export type ExplainErrorKind =
  | 'network'
  | 'api'
  | 'safety'
  | 'timeout'
  | 'unavailable'
  | 'rate-limit' // NEW

export interface ExplainState {
  status: 'loading' | 'success' | 'error'
  result: ExplainResult | null
  errorKind: ExplainErrorKind | null
  errorMessage: string | null
  retryAfterSeconds: number | null // NEW — non-null only when errorKind === 'rate-limit'
}

// useReflectOnPassage gets the same surgical changes (mirror).
```

**localStorage keys this spec touches:**

| Key | Read/Write | Description |
|-----|-----------|-------------|
| `bb32-v1:explain:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | Both | One cache entry per Explain request. Value shape: `{ v, feature, model, reference, content, createdAt }`. 7-day TTL. Cleaned up by `clearExpiredAICache()`. |
| `bb32-v1:reflect:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | Both | One cache entry per Reflect request. Same shape and TTL as Explain. |

The `bb32-v1:` prefix does NOT use the standard `wr_` prefix — same exception precedent as `bible:` from BB-0/BB-8/BB-21. This is documented in the spec § "Auth & Persistence" and codified in Step 9 (the `11-local-storage-keys.md` update).

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | `ExplainSubViewError` already wraps naturally. Countdown line stacks below the error message paragraph. Retry button retains 44px tap target. |
| Tablet | 768px | Inherits BB-30/BB-31 layout. Countdown line and disabled state look identical to mobile. |
| Desktop | 1440px | Inherits BB-30/BB-31 layout. No structural changes. |

**Custom breakpoints:** none. BB-32 does not introduce any breakpoint-specific behavior.

---

## Inline Element Position Expectations

**N/A — no inline-row layouts in this feature.** The only UI change is text content + button opacity inside an existing column-stacked card. There is no chip row, no label+input pair, no flex-wrap concern.

---

## Vertical Rhythm

**N/A — BB-32 introduces no new section spacing.** The existing `ExplainSubViewError` `flex flex-col items-center justify-center px-6 py-12` (`ExplainSubViewError.tsx:27`) layout is preserved verbatim.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-30 and BB-31 are shipped and committed (verified — `git log` shows 79b4987 and cb212c0)
- [ ] `frontend/src/lib/ai/geminiClient.ts` exists with both `generateExplanation` and `generateReflection`
- [ ] `frontend/.env.local` contains `VITE_GEMINI_API_KEY` (already verified during BB-30/BB-31 prompt testing)
- [ ] Current test counts confirmed (verified 2026-04-11): 43 in `geminiClient.test.ts`, **16** in `useExplainPassage.test.ts`, 15 in `useReflectOnPassage.test.ts`, 6 in `ExplainSubViewError.test.tsx`. **Hook total: 31** (matches spec acceptance criterion 26). All 31 hook tests pass green on the current working tree. Test files have been touched only by their original spec commits (cb212c0 BB-30, 79b4987 BB-31) — no silent drops or consolidation.
- [ ] No existing `bb32-v1:` localStorage keys in any test fixture or mock (cache module starts empty)
- [ ] `pnpm test` baseline runs cleanly on the current branch before Step 1 begins
- [ ] All auth-gated actions from the spec are accounted for in the plan (zero — confirmed)
- [ ] Design system values are verified (only the disabled button pattern; no new visuals)
- [ ] All [UNVERIFIED] values are flagged with verification methods (zero — confirmed)
- [ ] No deprecated patterns introduced (verified — Step 7 reuses the existing component verbatim except for the additive prop)
- [ ] Stay on `bible-redesign` branch — no new branch, no merge

**Resolved ambiguities:**

1. **Spec note 1: "extract `generateWithPromptAndCacheAndRateLimit` as a shared helper or inline".** The plan attempts the helper extraction (Step 5). If during execution a single existing test in `geminiClient.test.ts` would require modification, Step 5 falls back to the **Inline Variant** (sub-step 5b) which duplicates the cache + rate-limit logic into both `generateExplanation` and `generateReflection`. Behavior preservation > code cleanliness.
2. **Spec note 2: "Cache key collisions are silent failures."** Acceptance criterion 45 requires verifying 16 unique keys across BB-30 and BB-31 prompt-test passages. Step 1 includes this collision test. The hash function is DJB2 (32-bit, base-36 encoded → 6-7 chars). Two BB-30 references (`1 Corinthians 13:4-7`, `Philippians 4:6-7`) collide with two BB-31 references — but the `<feature>` segment of the key (`explain` vs `reflect`) ensures all 16 keys remain unique.
3. **Spec § "Cache hit UX" escape hatch.** The plan does NOT take the synchronous-pre-check escape hatch in Step 6. If during execution the one-frame loading flash is visually distracting in `/verify-with-playwright`, the executor MAY add the synchronous pre-check inside the hook as a follow-up — but only if no existing test breaks.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage backend for cache | localStorage with try/catch wrapper | Spec § "The cache layer" — graceful no-op on failure |
| Storage backend for rate limit | In-memory only (`const buckets = {...}`) | Spec § "The rate-limit layer" — reload clears bucket, intentional |
| Hash function for verse text | DJB2 (`((h << 5) + h) + char.charCodeAt(0)`), output base-36 | Spec note 2 — fast, non-cryptographic, sufficient for the 16-passage collision check |
| TTL constant location | `cache.ts` const `CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000` | Spec note 3 — documented as default, future-tunable |
| Cache cap constant location | `cache.ts` const `CACHE_MAX_BYTES = 2 * 1024 * 1024` | Spec § "Cache size cap" |
| Eviction algorithm | Sort all `bb32-v1:*` entries by `createdAt` ascending, remove oldest one at a time until under cap | Spec § "Cache size cap" — LRU-ish based on creation timestamp |
| Behavior when single entry exceeds cap | Silently drop the new entry, do not throw | Spec note 4 — "extremely unlikely … the write silently fails and the function returns without error" |
| Cache key prefix version bump policy | Bump `bb32-v1` → `bb32-v2` in a future spec to invalidate; `clearExpiredAICache()` sweeps version-mismatched entries | Spec § "Cache versioning" |
| What gets cached on errors | Nothing | Spec § "What does NOT get cached" |
| Rate-limit reset on token-bucket overflow during refill | `Math.min(BUCKET_SIZE, tokens + tokensToAdd)` | Spec § "Refill math" |
| `lastRefillAt` update timing | Only when tokens are added (preserves fractional accumulation between calls) | Spec § "Refill math" comment |
| Per-feature bucket isolation | Two independent records keyed `'explain'` and `'reflect'` | Spec § "Per-feature buckets" |
| Sub-second refill behavior | `Math.floor(elapsedMinutes * REFILL_PER_MINUTE)` — nothing added below 6-second threshold | Spec § "Refill math" — `floor()` is in the spec |
| `RateLimitError.retryAfterSeconds` calculation | `Math.ceil((6000 - (now - lastRefillAt)) / 1000)` (seconds until next token would refill) | Derived from spec — 1 token / 6000ms = "next token in N seconds, rounded up" |
| Helper extraction vs inline | Attempt extraction in Step 5; fall back to inline (sub-step 5b) if it would break any existing test | Spec § "Behavior preservation rule" + Notes for execution rule 1 |
| Cache failure surface to UI | Silent — wrapped in try/catch, no error propagation | Spec acceptance criterion 37 |
| Hook countdown UI source of truth | Component-level `useState` + `useEffect` `setInterval`, not hook state | Spec § "When `kind === 'rate-limit'`" — "Countdown implemented entirely within the component" + acceptance criterion 31 |
| `retryAfterSeconds` propagation through hook | New optional `null`-able field on `ExplainState` and `ReflectState`, populated only when `errorKind === 'rate-limit'` | Spec § "Hook state shape addition" |
| Re-firing request after countdown | The component's local `useEffect` decrements a `secondsLeft` state; when 0, the button becomes enabled and `onRetry` re-fires the existing hook retry path (which already exists in BB-30) | Spec § "When the countdown reaches zero" |
| Test mock for `Date.now()` | `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-04-11T00:00:00Z'))` | Standard Vitest pattern for time-dependent tests |

---

## Implementation Steps

### Step 1: Create the cache module

**Objective:** Build the standalone, framework-agnostic localStorage cache layer with TTL, version, and LRU-ish eviction.

**Files to create/modify:**
- `frontend/src/lib/ai/cache.ts` — NEW. Single file, ~200 lines, no React, no SDK imports.
- `frontend/src/lib/ai/__tests__/cache.test.ts` — NEW. ≥25 unit tests.

**Details:**

Define module-level constants:

```ts
const CACHE_KEY_PREFIX = 'bb32-v1:'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const CACHE_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ENTRY_SCHEMA_VERSION = 1
```

Export the public API:

```ts
export type AIFeature = 'explain' | 'reflect'

export interface CachedResult {
  content: string
  model: string
}

interface StoredEntry {
  v: number
  feature: AIFeature
  model: string
  reference: string
  content: string
  createdAt: number
}

export function getCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
): CachedResult | null

export function setCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
  value: CachedResult,
): void

export function clearExpiredAICache(): number

export function clearAllAICache(): void

export function getAICacheStorageBytes(): number
```

Implement private helpers:

```ts
function safeLocalStorageGet(key: string): string | null
function safeLocalStorageSet(key: string, value: string): boolean
function safeLocalStorageRemove(key: string): void
function listAllCacheKeys(): string[] // iterates localStorage looking for CACHE_KEY_PREFIX
function hashString(input: string): string // DJB2, base-36
function buildCacheKey(feature: AIFeature, model: string, reference: string, verseText: string): string
function evictOldestUntilUnderLimit(maxBytes: number): void
```

DJB2 hash:

```ts
function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}
```

`buildCacheKey`:

```ts
function buildCacheKey(
  feature: AIFeature,
  model: string,
  reference: string,
  verseText: string,
): string {
  return `${CACHE_KEY_PREFIX}${feature}:${model}:${reference}:${hashString(verseText)}`
}
```

`getCachedAIResult` flow:

1. Build the cache key. The model is hardcoded to `'gemini-2.5-flash-lite'` here — the cache module reads it from a small internal constant `CURRENT_MODEL = 'gemini-2.5-flash-lite'` so the cache module is fully self-contained and `geminiClient.ts` does not need to pass model into the cache calls. Rationale: keeps the public cache API to 3 args (feature, reference, verseText) per spec § "Exports".
2. Read the value via `safeLocalStorageGet`. If null, return null.
3. `JSON.parse` inside try/catch. On parse failure, remove the corrupt entry and return null.
4. Validate `entry.v === ENTRY_SCHEMA_VERSION`. On mismatch, remove the entry and return null.
5. Compute `now - entry.createdAt`. If `> CACHE_TTL_MS`, remove the entry and return null.
6. Return `{ content: entry.content, model: entry.model }`.

`setCachedAIResult` flow:

1. Build the cache key and the `StoredEntry` object with `createdAt: Date.now()`.
2. Compute `JSON.stringify(entry).length`.
3. If `getAICacheStorageBytes() + newEntryBytes > CACHE_MAX_BYTES`, call `evictOldestUntilUnderLimit(CACHE_MAX_BYTES - newEntryBytes)`.
4. After eviction, if `getAICacheStorageBytes() + newEntryBytes > CACHE_MAX_BYTES` (single entry too large to fit even after full eviction), silently return.
5. Otherwise, `safeLocalStorageSet(key, JSON.stringify(entry))`. If the set returns false (quota exceeded), silently return.

`clearExpiredAICache` flow:

1. List all cache keys.
2. For each, parse and check version + TTL. Remove expired or version-mismatched entries.
3. Return the count cleared.

`clearAllAICache` flow:

1. List all cache keys, remove each.

`getAICacheStorageBytes` flow:

1. List all cache keys.
2. Sum `(key.length + (value?.length ?? 0)) * 2` (rough UTF-16 byte estimate).
3. Return the sum.

`evictOldestUntilUnderLimit` flow:

1. List all cache keys, parse each into `{ key, createdAt, bytes }` tuples.
2. Sort by `createdAt` ascending.
3. Pop oldest, remove from storage, recompute total bytes.
4. Repeat until total bytes ≤ `maxBytes`.

`safeLocalStorageGet/Set/Remove` flow:

```ts
function safeLocalStorageGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    globalThis.localStorage?.setItem(key, value)
    return true
  } catch {
    return false // QuotaExceededError, security errors, etc.
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // ignore
  }
}
```

`listAllCacheKeys` flow:

```ts
function listAllCacheKeys(): string[] {
  try {
    const ls = globalThis.localStorage
    if (!ls) return []
    const keys: string[] = []
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}
```

**Auth gating (if applicable):** N/A — cache module has no auth concept.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — non-UI step.

**Guardrails (DO NOT):**

- DO NOT import React, hooks, the Gemini SDK, the env module, or anything else outside pure TypeScript stdlib.
- DO NOT throw from any exported function. All localStorage operations are wrapped in try/catch and degrade silently per acceptance criterion 37.
- DO NOT cache error results. The cache only stores successful `CachedResult` shapes.
- DO NOT use `wr_` as the key prefix. Use `bb32-v1:` per spec § "Auth & Persistence".
- DO NOT use a cryptographic hash. DJB2 is sufficient and intentional per spec note 2.
- DO NOT export internal helpers (`hashString`, `buildCacheKey`, `evictOldestUntilUnderLimit`, `safeLocalStorage*`). Only the 5 public functions named in the spec.
- DO NOT bump the cache key version (`bb32-v1`) within this spec — that's reserved for future invalidation work.
- DO NOT add cache statistics, hit-rate logging, or any kind of telemetry per spec note "Do NOT add cache statistics".
- DO NOT add a `clearAllAICache()` UI trigger anywhere in this step or in any other step.

**Test specifications:**

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | `getCachedAIResult` returns null on cache miss | unit | Empty localStorage, expect null |
| 2 | `setCachedAIResult` stores an entry retrievable by `getCachedAIResult` | unit | Round-trip test |
| 3 | `getCachedAIResult` returns the cached `{content, model}` shape | unit | Verifies the public CachedResult shape |
| 4 | `setCachedAIResult` writes a key with the `bb32-v1:` prefix | unit | Inspects localStorage directly |
| 5 | `setCachedAIResult` writes a key in `bb32-v1:<feature>:<model>:<reference>:<hash>` format | unit | Acceptance criterion 3 |
| 6 | `getCachedAIResult` for `'explain'` does not return an entry stored under `'reflect'` (per-feature isolation) | unit | Same reference + verseText, different features |
| 7 | `getCachedAIResult` returns null after TTL expires | unit | `vi.setSystemTime` advances 7d + 1ms; expect null + entry removed |
| 8 | `getCachedAIResult` returns the entry within the 7-day TTL | unit | Advance 6 days, expect hit |
| 9 | `getCachedAIResult` removes a corrupt JSON entry and returns null | unit | Manually write `'not-json'` to a `bb32-v1:` key |
| 10 | `getCachedAIResult` removes a version-mismatched entry and returns null | unit | Manually write `{v: 2, ...}` to a `bb32-v1:` key |
| 11 | `clearExpiredAICache` removes only expired entries and returns the count | unit | Mix of expired + fresh entries |
| 12 | `clearExpiredAICache` removes version-mismatched entries | unit | Per spec § "Cache versioning" |
| 13 | `clearAllAICache` removes all `bb32-v1:` entries but no other localStorage keys | unit | Mix BB-32 entries with `wr_*` and `bible:*` keys, only BB-32 keys removed |
| 14 | `getAICacheStorageBytes` returns 0 for empty cache | unit | |
| 15 | `getAICacheStorageBytes` returns roughly the JSON byte size of stored entries | unit | Within ±20% of actual byte size |
| 16 | `setCachedAIResult` triggers eviction when adding would exceed 2 MB cap | unit | Pre-fill cache to 1.99 MB, add a 100-KB entry, oldest entries evicted |
| 17 | Eviction removes oldest entries first (LRU-ish by `createdAt`) | unit | Three entries created at t=0, t=1000, t=2000; advance + add 4th at near-cap; first removed |
| 18 | A single entry larger than 2 MB silently fails to write | unit | Spec note 4 |
| 19 | All cache operations are no-ops when localStorage throws (private browsing simulation) | unit | Stub `localStorage.getItem/setItem/removeItem` to throw; no exception propagates |
| 20 | All cache operations are no-ops when `globalThis.localStorage` is undefined | unit | Set `(globalThis as any).localStorage = undefined` |
| 21 | DJB2 hash is deterministic for the same input | unit | (tests `hashString` indirectly via `buildCacheKey` since it's not exported) — verify the same `(feature, ref, text)` produces the same key on repeated calls |
| 22 | Different verse text produces different cache keys for the same reference | unit | Two `setCachedAIResult` calls with same ref + different verse text → two distinct keys in localStorage |
| 23 | Cache key collision verification — 16 BB-30 + BB-31 prompt-test passages produce 16 unique keys AND keys are deterministic across repeated calls | unit | Hardcode the 8 BB-30 (`John 3:16`, `Psalm 23:1`, `1 Corinthians 13:4-7`, `Philippians 4:6-7`, `Leviticus 19:19`, `Genesis 22:1-2`, `1 Timothy 2:11-12`, `Romans 1:26-27`) + 8 BB-31 (`Psalm 23:1-4`, `Ecclesiastes 3:1-8`, `Matthew 6:25-27`, `Romans 8:38-39`, `Proverbs 13:11`, `1 Corinthians 13:4-7`, `Ephesians 5:22-24`, `Philippians 4:6-7`) references and verse texts. Generate the 16 keys TWICE (two full passes through the same inputs). Assertions: (a) `new Set(firstPass).size === 16` — zero collisions on the first pass; (b) `new Set([...firstPass, ...secondPass]).size === 16` — the second pass produces the EXACT same 16 keys, not 32 different keys (catches hidden state in the DJB2 hash or in `buildCacheKey`). Note: since keys are not exported, the test calls `setCachedAIResult` for each (feature, ref, text) tuple then reads `localStorage.length` after each pass — or alternatively uses a test-only harness that introspects localStorage keys via `Object.keys(localStorage).filter(k => k.startsWith('bb32-v1:'))` after each pass. **Acceptance criterion 45 + determinism guard.** |
| 24 | `setCachedAIResult` preserves the model string on round trip | unit | Set with `model: 'gemini-2.5-flash-lite'`, get returns same model |
| 25 | Two `setCachedAIResult` calls with the same key overwrite (latest wins) | unit | Verify `createdAt` updates and content reflects latest call |
| 26 | `getCachedAIResult` does not throw when called before any `setCachedAIResult` | unit | Smoke test for empty-state safety |

**Expected state after completion:**

- [ ] `frontend/src/lib/ai/cache.ts` exists with the 5 public exports
- [ ] All 26 cache tests pass (1 over the spec minimum of 25)
- [ ] `tsc --noEmit` clean
- [ ] No imports of React, hooks, SDK, env module
- [ ] All BB-30 and BB-31 tests still pass (unchanged)

---

### Step 2: Create the rate-limit module

**Objective:** Build the standalone, in-memory token-bucket rate limiter with per-feature buckets.

**Files to create/modify:**
- `frontend/src/lib/ai/rateLimit.ts` — NEW. Single file, ~120 lines, no React, no SDK, no localStorage.
- `frontend/src/lib/ai/__tests__/rateLimit.test.ts` — NEW. ≥15 unit tests.

**Details:**

```ts
export const RATE_LIMIT_BUCKET_SIZE = 10
export const RATE_LIMIT_REFILL_PER_MINUTE = 10

const REFILL_INTERVAL_MS = (60 * 1000) / RATE_LIMIT_REFILL_PER_MINUTE // 6000ms per token

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

function refill(bucket: Bucket): void {
  const now = Date.now()
  const elapsedMs = now - bucket.lastRefillAt
  if (elapsedMs <= 0) return // clock-skew safety
  const elapsedMinutes = elapsedMs / 60000
  const tokensToAdd = Math.floor(elapsedMinutes * RATE_LIMIT_REFILL_PER_MINUTE)
  if (tokensToAdd <= 0) return // sub-6-second call, do not update lastRefillAt
  bucket.tokens = Math.min(RATE_LIMIT_BUCKET_SIZE, bucket.tokens + tokensToAdd)
  // Advance lastRefillAt by exactly the consumed time so fractional accumulation
  // is preserved across calls. (Per spec § "Refill math" comment.)
  bucket.lastRefillAt += Math.floor((tokensToAdd / RATE_LIMIT_REFILL_PER_MINUTE) * 60000)
}

export function consumeRateLimitToken(feature: AIFeature): RateLimitDecision {
  const bucket = buckets[feature]
  refill(bucket)
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true }
  }
  // Compute retryAfterSeconds — time until next token would refill
  const msUntilNextToken = REFILL_INTERVAL_MS - (Date.now() - bucket.lastRefillAt)
  const retryAfterSeconds = Math.max(1, Math.ceil(msUntilNextToken / 1000))
  return { allowed: false, retryAfterSeconds }
}

export function getRateLimitState(feature: AIFeature): {
  tokensRemaining: number
  nextRefillInSeconds: number
} {
  const bucket = buckets[feature]
  refill(bucket)
  const msUntilNextToken = REFILL_INTERVAL_MS - (Date.now() - bucket.lastRefillAt)
  return {
    tokensRemaining: bucket.tokens,
    nextRefillInSeconds: Math.max(0, Math.ceil(msUntilNextToken / 1000)),
  }
}

export function resetRateLimitForTests(): void {
  const now = Date.now()
  buckets.explain = { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: now }
  buckets.reflect = { tokens: RATE_LIMIT_BUCKET_SIZE, lastRefillAt: now }
}
```

**Auth gating:** N/A — no auth.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A — non-UI step.

**Guardrails (DO NOT):**

- DO NOT use localStorage. Spec § "Storage backend" — in-memory only.
- DO NOT add `setInterval`-based refill. Refill is on-demand inside `consumeRateLimitToken` and `getRateLimitState`.
- DO NOT export the `buckets` object or the `refill` helper. Only the 5 listed exports.
- DO NOT make the bucket parameters environment-variable-configurable. They are exported constants only (spec § "Bucket parameters").
- DO NOT add cross-tab synchronization (e.g., via BroadcastChannel or storage events). Per-tab is intentional per spec.
- DO NOT throw on any input. All decisions are returned via the `RateLimitDecision` discriminated union.
- DO NOT add telemetry, logging, or analytics.
- DO NOT update `lastRefillAt` when sub-token elapsed time (avoids losing fractional accumulation).

**Test specifications:**

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | First call to `consumeRateLimitToken('explain')` returns `{allowed: true}` | unit | Fresh bucket |
| 2 | 10 consecutive calls all return `{allowed: true}` (full bucket consumed) | unit | Consumes the burst budget |
| 3 | 11th consecutive call returns `{allowed: false, retryAfterSeconds: ~6}` | unit | Bucket empty, computed retry |
| 4 | After waiting 6 seconds (fake timers), 12th call returns `{allowed: true}` | unit | One token refilled |
| 5 | After waiting 60 seconds, bucket fully refills to 10 | unit | Spec acceptance criterion 43 |
| 6 | `consumeRateLimitToken('explain')` does not consume from `'reflect'` bucket (per-feature isolation) | unit | Drain explain to zero, reflect still has 10. **Acceptance criterion 9 + 44.** |
| 7 | `consumeRateLimitToken('reflect')` does not consume from `'explain'` bucket | unit | Mirror of test 6 |
| 8 | `getRateLimitState` returns correct `tokensRemaining` after partial consumption | unit | Drain 4, expect 6 remaining |
| 9 | `getRateLimitState` returns `nextRefillInSeconds` near 6 immediately after consumption | unit | Sanity check |
| 10 | `getRateLimitState` returns `tokensRemaining: 10` after a full minute idle | unit | Refill via on-demand |
| 11 | `resetRateLimitForTests` restores both buckets to full | unit | Drain both, reset, both full |
| 12 | `RATE_LIMIT_BUCKET_SIZE === 10` | unit | Constant assertion |
| 13 | `RATE_LIMIT_REFILL_PER_MINUTE === 10` | unit | Constant assertion |
| 14 | Sub-6-second call does not advance `lastRefillAt` (fractional accumulation preserved) | unit | Two `consumeRateLimitToken` calls 1 second apart; after 5 more seconds, the next `getRateLimitState` shows `nextRefillInSeconds === 0` (token ready) — verifies the 5-second-old call didn't reset the timer |
| 15 | Clock skew safety — `Date.now()` going backwards does not crash or add tokens | unit | Mock `Date.now` to return earlier value; refill is a no-op |
| 16 | `retryAfterSeconds` is always at least 1 | unit | Even when computed value is fractional under 1, `Math.max(1, ...)` floors it |
| 17 | Bucket overflow capped at `BUCKET_SIZE` after long idle | unit | Idle 10 minutes; bucket still 10, not 100 |

**Expected state after completion:**

- [ ] `frontend/src/lib/ai/rateLimit.ts` exists with 5 public exports
- [ ] 17 rate-limit tests pass (2 over the spec minimum of 15)
- [ ] `tsc --noEmit` clean
- [ ] No imports of React, localStorage, SDK, env module

---

### Step 3: Add `RateLimitError` to errors.ts

**Objective:** Append the new error class without modifying any of the five existing classes.

**Files to create/modify:**
- `frontend/src/lib/ai/errors.ts` (1–121) — APPEND after line 121, do not modify lines 1–121
- `frontend/src/lib/ai/__tests__/errors.test.ts` — APPEND ≥5 tests

**Details:**

Add at the end of `errors.ts`:

```ts
/**
 * Thrown when a request was denied by the client-side rate limiter (BB-32).
 *
 * Carries `retryAfterSeconds` so the UI can render a live countdown. The hook
 * exposes this on its state via the `'rate-limit'` error kind.
 *
 * User-facing copy (in the hook): "You're going faster than our AI helper can
 * keep up. Try again in {seconds} seconds."
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
```

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT modify the five existing error classes (acceptance criterion 14). The plan loads the byte-current versions before editing.
- DO NOT modify the `assignCause` helper or the `ErrorOptions` interface.
- DO NOT export anything other than `RateLimitError` from this addition.
- DO NOT add `RateLimitError` to any default export — there is no default export.
- DO NOT use `cause` via the ES2022 constructor option bag. Use `assignCause(this, options)` per the existing pattern.

**Test specifications:**

| # | Test | Type | Description |
|---|------|------|-------------|
| 1 | `new RateLimitError(8)` is an instance of `RateLimitError` and `Error` | unit | Class identity |
| 2 | `RateLimitError` exposes `retryAfterSeconds: 8` after construction | unit | Field assignment |
| 3 | `RateLimitError.message` includes the seconds in the format "Too many requests. Try again in 8 seconds." | unit | Verifies the constructor template literal |
| 4 | `RateLimitError.name === 'RateLimitError'` | unit | Standard error name |
| 5 | `RateLimitError` preserves `cause` when constructed with `{cause: original}` | unit | Mirrors the existing 5-class cause-preservation pattern |
| 6 | The five existing error classes are unchanged in count (export count assertion) | unit | Imports `* as errorsModule`, asserts `Object.keys(errorsModule).length === 6` (5 existing + 1 new) — protects acceptance criterion 14 |

**Expected state after completion:**

- [ ] `frontend/src/lib/ai/errors.ts` exports 6 error classes (5 existing + `RateLimitError`)
- [ ] 6 new errors tests pass; all existing errors tests still pass (count appended, not replaced)
- [ ] `tsc --noEmit` clean

---

### Step 4: Wire cache + rate-limit into both Gemini client functions (helper extraction attempt)

**Objective:** Extract the shared `generateWithPromptAndCacheAndRateLimit` helper and route both `generateExplanation` and `generateReflection` through it. **All 43 existing tests must pass byte-unchanged.**

**Files to create/modify:**
- `frontend/src/lib/ai/geminiClient.ts` (1–326) — refactor

**Details:**

Add imports at the top:

```ts
import { getCachedAIResult, setCachedAIResult, type AIFeature } from '@/lib/ai/cache'
import { consumeRateLimitToken } from '@/lib/ai/rateLimit'
import {
  GeminiApiError,
  GeminiKeyMissingError,
  GeminiNetworkError,
  GeminiSafetyBlockError,
  GeminiTimeoutError,
  RateLimitError, // NEW
} from '@/lib/ai/errors'
```

Define the helper between the existing `__resetGeminiClientForTests` (line 91-93) and `generateExplanation` (line 118):

```ts
async function generateWithPromptAndCacheAndRateLimit(
  feature: AIFeature,
  systemPrompt: string,
  reference: string,
  verseText: string,
  buildUserPrompt: (ref: string, text: string) => string,
  signal?: AbortSignal,
): Promise<{ content: string; model: string }> {
  // 1. Cache lookup — synchronous, no rate-limit consumption, no API call
  const cached = getCachedAIResult(feature, reference, verseText)
  if (cached) return cached

  // 2. Rate-limit check — consumes a token if allowed, throws if denied
  const decision = consumeRateLimitToken(feature)
  if (!decision.allowed) {
    throw new RateLimitError(decision.retryAfterSeconds)
  }

  // 3. Lazy SDK client (preserves all existing key-missing semantics)
  const ai = getClient()

  // 4. Build the user prompt
  const userPrompt = buildUserPrompt(reference, verseText)

  // 5. Compose abort signals (caller + internal timeout) — preserved verbatim
  //    from generateExplanation:126-132
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  // 6. SDK call + error mapping — preserved verbatim from generateExplanation:134-177
  let response
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: combinedSignal,
      },
    })
  } catch (err) {
    if (signal?.aborted && err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new GeminiTimeoutError(undefined, { cause: err })
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GeminiTimeoutError('Gemini request was aborted', { cause: err })
    }
    if (
      err instanceof TypeError ||
      (err instanceof Error && /network|fetch|offline/i.test(err.message))
    ) {
      throw new GeminiNetworkError(undefined, { cause: err })
    }
    throw new GeminiApiError(
      err instanceof Error ? err.message : 'Unknown Gemini API error',
      { cause: err },
    )
  }

  // 7. Safety block detection — preserved verbatim from generateExplanation:179-204
  const promptBlockReason = response.promptFeedback?.blockReason
  if (promptBlockReason) {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the prompt: ${promptBlockReason}`,
    )
  }

  const firstCandidate = response.candidates?.[0]
  const finishReason = firstCandidate?.finishReason
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    throw new GeminiSafetyBlockError(
      `Gemini blocked the response: finishReason=${finishReason}`,
    )
  }

  const content = response.text?.trim()
  if (!content) {
    throw new GeminiSafetyBlockError(
      'Gemini returned an empty response (likely a silent safety block)',
    )
  }

  // 8. Build the result
  const result = { content, model: MODEL }

  // 9. Cache the SUCCESSFUL result only
  setCachedAIResult(feature, reference, verseText, result)

  return result
}
```

Then rewrite `generateExplanation` and `generateReflection` as thin wrappers:

```ts
export async function generateExplanation(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  return generateWithPromptAndCacheAndRateLimit(
    'explain',
    EXPLAIN_PASSAGE_SYSTEM_PROMPT,
    reference,
    verseText,
    buildExplainPassageUserPrompt,
    signal,
  )
}

export async function generateReflection(
  reference: string,
  verseText: string,
  signal?: AbortSignal,
): Promise<ReflectResult> {
  return generateWithPromptAndCacheAndRateLimit(
    'reflect',
    REFLECT_PASSAGE_SYSTEM_PROMPT,
    reference,
    verseText,
    buildReflectPassageUserPrompt,
    signal,
  )
}
```

Run `pnpm test frontend/src/lib/ai/__tests__/geminiClient.test.ts`. **All 43 existing tests must pass.** If even one fails, abort the helper extraction and proceed to **Step 4b (Inline Variant)** below.

#### Step 4b — INLINE VARIANT (fallback only if Step 4 breaks any existing test)

Restore `generateExplanation` and `generateReflection` to their pre-Step-4 form. Then in each function, add the cache check at the very top (before `getClient`) and the rate-limit check immediately after `getClient()` succeeds. Both functions get duplicated cache + rate-limit logic. The shared helper is NOT extracted.

**Inline insert location for `generateExplanation`** (before existing line 123 `const ai = getClient()`):

```ts
const cached = getCachedAIResult('explain', reference, verseText)
if (cached) return cached

const decision = consumeRateLimitToken('explain')
if (!decision.allowed) {
  throw new RateLimitError(decision.retryAfterSeconds)
}

const ai = getClient() // existing line 123
```

And after the existing safety-block detection block (after line 204, before `return { content, model: MODEL }`):

```ts
const result = { content, model: MODEL }
setCachedAIResult('explain', reference, verseText, result)
return result
```

Mirror image for `generateReflection` with `'reflect'`. The Inline Variant accepts duplication as the price of behavior preservation.

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT modify the existing test file `geminiClient.test.ts` in this step (acceptance criteria 21–22, 34).
- DO NOT change the `MODEL` constant, `TEMPERATURE`, `MAX_OUTPUT_TOKENS`, or `REQUEST_TIMEOUT_MS`.
- DO NOT change the `getClient()` lazy initialization or `__resetGeminiClientForTests`.
- DO NOT change the public function signatures of `generateExplanation` or `generateReflection`.
- DO NOT cache error results. The `setCachedAIResult` call is positioned AFTER all error throws, only on the success path (acceptance criterion 20).
- DO NOT consume a rate-limit token on a cache hit. The cache check returns early before the rate-limit check (acceptance criterion 17).
- DO NOT call the SDK on a cache hit (acceptance criterion 18).
- DO NOT throw `RateLimitError` after the SDK call has fired (acceptance criterion 19 — denial happens BEFORE the API call).
- DO NOT modify the prompt files (`explainPassagePrompt.ts`, `reflectPassagePrompt.ts`).
- DO NOT modify `errors.ts` in this step (errors module change happened in Step 3).
- If tests pass after the helper extraction → keep it. If even one fails → revert and use the Inline Variant.

**Test specifications:**

This step does NOT add tests. It is a refactor that must keep all 43 existing tests green. New helper-integration tests are added in **Step 5**.

**Expected state after completion:**

- [ ] `geminiClient.ts` either has the new `generateWithPromptAndCacheAndRateLimit` helper (if Step 4 succeeded) or has cache + rate-limit logic inlined into both functions (Step 4b)
- [ ] All 43 existing geminiClient tests pass byte-unchanged (acceptance criteria 21–22, 34)
- [ ] `tsc --noEmit` clean
- [ ] `pnpm test` baseline runs cleanly across the full suite
- [ ] If Step 4b was used, the deviation is logged in the Execution Log with the failing test name

---

### Step 5: Append helper-integration tests to geminiClient.test.ts

**Objective:** Cover the new cache hit / cache miss / rate-limit denial / cache-bypass-on-error behaviors. Existing 43 tests are NOT modified.

**Files to create/modify:**
- `frontend/src/lib/ai/__tests__/geminiClient.test.ts` — APPEND ≥5 new `describe` blocks at the end

**Details:**

Add a `beforeEach` at the start of each new describe to reset both the cache and the rate limiter:

```ts
import { clearAllAICache } from '../cache'
import { resetRateLimitForTests, RATE_LIMIT_BUCKET_SIZE } from '../rateLimit'
import { RateLimitError } from '../errors'

beforeEach(() => {
  clearAllAICache()
  resetRateLimitForTests()
})
```

(Append this `beforeEach` next to the existing one, NOT replacing it.)

**Test specifications (appended only — existing 43 tests untouched):**

| # | Test | Type | Description |
|---|------|------|-------------|
| 44 | `generateExplanation` returns cached result on second call without firing the SDK | integration | First call hits SDK; clear `mockGenerateContent`; second call returns same content; `mockGenerateContent` not called. **Acceptance criteria 17, 18, 41.** |
| 45 | `generateReflection` returns cached result on second call without firing the SDK | integration | Mirror for reflect |
| 46 | `generateExplanation` cache hit does NOT consume a rate-limit token | integration | First call (cache miss) consumes 1 token; second call (cache hit) does not. Verify via `getRateLimitState('explain').tokensRemaining`. **Acceptance criterion 17.** |
| 47 | `generateExplanation` throws `RateLimitError` after 10 successful calls (bucket drained) | integration | 10 distinct passages, 10 successful calls; 11th call → `RateLimitError`; SDK NOT called for the 11th. **Acceptance criteria 19, 42.** |
| 48 | The thrown `RateLimitError` carries `retryAfterSeconds > 0` | integration | Direct field assertion |
| 49 | `RateLimitError` is thrown BEFORE the SDK is called | integration | Drain bucket; assert `mockGenerateContent.mock.calls.length` does not increment for the rejected request |
| 50 | Network errors are NOT cached — second call after a network error fires the SDK again | integration | First call rejects with network error; second call (with same args) fires SDK again. **Acceptance criterion 20.** |
| 51 | Safety errors are NOT cached — second call after a safety block fires the SDK again | integration | Same with safety block |
| 52 | API errors are NOT cached — second call after an API error fires the SDK again | integration | Same with API error |
| 53 | Explain rate limit and Reflect rate limit are independent — draining Explain does not block Reflect | integration | Drain Explain bucket; Reflect call still succeeds. **Acceptance criterion 44.** |
| 54 | Cache entry survives `__resetGeminiClientForTests` — cache is module-singleton independent of SDK client | integration | Set cache, reset client, get cache → still hits |
| 55 | Cache hit returns the same `{content, model}` shape that the SDK call would have returned | integration | Verify shape parity |

**Auth gating:** N/A.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT modify any of the existing 43 tests. They are the contract.
- DO NOT add any new mocks at the module level — reuse the existing `vi.hoisted()` `mockGenerateContent` and `mockRequireGeminiApiKey`.
- DO NOT mock the cache or rate-limit modules. They are real, lightweight, and the tests want to assert end-to-end behavior. Reset them in `beforeEach` instead.
- DO NOT use real `Date.now()` for time-sensitive rate-limit tests. Use `vi.useFakeTimers()` + `vi.setSystemTime()` if needed.
- DO NOT cache failed requests under any circumstance.

**Expected state after completion:**

- [ ] All 43 original geminiClient tests pass
- [ ] 12 new helper-integration tests pass (7 over the spec minimum of 5)
- [ ] Total geminiClient tests: 55
- [ ] `tsc --noEmit` clean

---

### Step 6: Update both hooks to handle `RateLimitError`

**Objective:** Add the `'rate-limit'` error kind, the `retryAfterSeconds` field, and the `instanceof RateLimitError` check to both `useExplainPassage` and `useReflectOnPassage`. All 31 existing hook tests must pass byte-unchanged.

**Files to create/modify:**
- `frontend/src/hooks/bible/useExplainPassage.ts` (1–146) — surgical additions
- `frontend/src/hooks/bible/useReflectOnPassage.ts` (1–152) — surgical additions
- `frontend/src/hooks/bible/__tests__/useExplainPassage.test.ts` — APPEND ≥3 tests
- `frontend/src/hooks/bible/__tests__/useReflectOnPassage.test.ts` — APPEND ≥3 tests

**Details:**

For `useExplainPassage.ts`:

1. Add import on line 9 (after the other error imports):
   ```ts
   import { ..., RateLimitError } from '@/lib/ai/errors'
   ```

2. Add `'rate-limit'` to `ExplainErrorKind` (line 16):
   ```ts
   export type ExplainErrorKind =
     | 'network'
     | 'api'
     | 'safety'
     | 'timeout'
     | 'unavailable'
     | 'rate-limit' // NEW
   ```

3. Add `retryAfterSeconds: number | null` to `ExplainState` (line 23):
   ```ts
   export interface ExplainState {
     status: 'loading' | 'success' | 'error'
     result: ExplainResult | null
     errorKind: ExplainErrorKind | null
     errorMessage: string | null
     retryAfterSeconds: number | null // NEW
   }
   ```

4. Add the rate-limit copy to `ERROR_COPY` (line 29). Note: this is a static template; the actual `{seconds}` interpolation happens at the component level using the live countdown. The hook stores the static template; the component substitutes:
   ```ts
   'rate-limit':
     "You're going faster than our AI helper can keep up. Try again in {seconds} seconds.",
   ```
   The component (`ExplainSubViewError`) is responsible for replacing `{seconds}` with the live countdown value (Step 7).

5. Update `classifyError` (line 39) to check `RateLimitError` FIRST:
   ```ts
   function classifyError(err: unknown): ExplainErrorKind {
     if (err instanceof RateLimitError) return 'rate-limit' // NEW — first check
     if (err instanceof GeminiSafetyBlockError) return 'safety'
     if (err instanceof GeminiTimeoutError) return 'timeout'
     if (err instanceof GeminiNetworkError) return 'network'
     if (err instanceof GeminiKeyMissingError) return 'unavailable'
     if (err instanceof GeminiApiError) return 'api'
     return 'unavailable'
   }
   ```

6. Update the initial `useState` call (line 61) to include the new field:
   ```ts
   const [state, setState] = useState<ExplainState>({
     status: 'loading',
     result: null,
     errorKind: null,
     errorMessage: null,
     retryAfterSeconds: null, // NEW
   })
   ```

7. Update the loading-state reset inside the effect (line 94):
   ```ts
   setState({
     status: 'loading',
     result: null,
     errorKind: null,
     errorMessage: null,
     retryAfterSeconds: null, // NEW
   })
   ```

8. Update the success branch (line 112) to include `retryAfterSeconds: null`:
   ```ts
   setState({
     status: 'success',
     result,
     errorKind: null,
     errorMessage: null,
     retryAfterSeconds: null, // NEW
   })
   ```

9. Update the error branch (line 127) to populate `retryAfterSeconds` only when the error kind is `'rate-limit'`:
   ```ts
   const kind = classifyError(err)
   const retryAfterSeconds =
     err instanceof RateLimitError ? err.retryAfterSeconds : null
   setState({
     status: 'error',
     result: null,
     errorKind: kind,
     errorMessage: ERROR_COPY[kind],
     retryAfterSeconds, // NEW
   })
   ```

Apply the SAME 9 changes to `useReflectOnPassage.ts` with `ReflectErrorKind` / `ReflectState` / `useReflectOnPassage` substitutions.

**Auth gating:** N/A — hooks remain auth-free.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT modify the existing `queueMicrotask` deferral, `AbortController` handling, or StrictMode comments.
- DO NOT modify the existing 31 hook tests (16 explain + 15 reflect = 31, matching the spec note "31 existing BB-30/BB-31 hook tests" — verified 2026-04-11 via `pnpm test`, all 31 green on the current working tree; file history shows zero touches since the original BB-30/BB-31 commits).
- DO NOT introduce new dependencies on `RateLimitError` outside the import + the `instanceof` check.
- DO NOT interpolate `{seconds}` inside the hook. The hook stores the literal `{seconds}` placeholder. The component substitutes at render time with the live countdown value.
- DO NOT consume a rate-limit token inside the hook — the hook still calls `generateExplanation`/`generateReflection` which handle this internally.
- DO NOT add new state for the countdown — the hook has only `retryAfterSeconds` (the initial deny value). Countdown decrement state lives in the component (Step 7).

**Test specifications (appended only — existing 31 tests untouched):**

For `useExplainPassage.test.ts` (current count 16 → appended count ≥19):

| # | Test | Type | Description |
|---|------|------|-------------|
| 17 | When `generateExplanation` rejects with `RateLimitError`, hook state has `errorKind === 'rate-limit'` | integration | Mock the import to throw RateLimitError(8); render hook; assert state. **Acceptance criterion 24.** |
| 18 | When `generateExplanation` rejects with `RateLimitError(8)`, hook state has `retryAfterSeconds === 8` | integration | **Acceptance criterion 25.** |
| 19 | When the hook is in success state (or any non-rate-limit error state), `retryAfterSeconds` is `null` | integration | Verifies the field defaults |
| 20 | The `ERROR_COPY['rate-limit']` template includes the `{seconds}` placeholder | unit | Direct check on the exported constant (via re-export or by inspecting state.errorMessage) |

For `useReflectOnPassage.test.ts` (current count 15 → appended count ≥18):

| # | Test | Type | Description |
|---|------|------|-------------|
| 16 | When `generateReflection` rejects with `RateLimitError`, hook state has `errorKind === 'rate-limit'` | integration | Mirror of explain test 13 |
| 17 | When `generateReflection` rejects with `RateLimitError(8)`, hook state has `retryAfterSeconds === 8` | integration | Mirror of explain test 14 |
| 18 | When the hook is in success state, `retryAfterSeconds` is `null` | integration | Mirror |
| 19 | Reflect hook uses its own error copy (not Explain's) for the rate-limit kind | unit | Currently both hooks share identical copy; this test asserts the literal string for documentation |

**Expected state after completion:**

- [ ] Both hooks have the new `'rate-limit'` error kind, `retryAfterSeconds` field, and `RateLimitError` check
- [ ] All 31 existing hook tests pass byte-unchanged (acceptance criterion 26)
- [ ] 8 new hook tests pass (4 per hook, exceeding the spec minimum of 5 across both)
- [ ] `tsc --noEmit` clean

---

### Step 7: Update `ExplainSubViewError` to render the countdown UI

**Objective:** Add the optional `retryAfterSeconds` prop, the local `useEffect` countdown, and the disabled-button visual treatment. **All 6 existing component tests must pass byte-unchanged.**

**Files to create/modify:**
- `frontend/src/components/bible/reader/ExplainSubViewError.tsx` (1–45)
- `frontend/src/components/bible/reader/__tests__/ExplainSubViewError.test.tsx` (1–57) — APPEND ≥5 tests
- `frontend/src/components/bible/reader/ExplainSubView.tsx` — pass `retryAfterSeconds={state.retryAfterSeconds ?? undefined}` to `ExplainSubViewError`
- `frontend/src/components/bible/reader/ReflectSubView.tsx` — same prop pass-through (mirror)

**Details:**

Update `ExplainSubViewError.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import type { ExplainErrorKind } from '@/hooks/bible/useExplainPassage'

interface ExplainSubViewErrorProps {
  kind: ExplainErrorKind
  message: string
  onRetry: () => void
  retryAfterSeconds?: number // NEW — only set when kind === 'rate-limit'
}

export function ExplainSubViewError({
  kind,
  message,
  onRetry,
  retryAfterSeconds,
}: ExplainSubViewErrorProps) {
  // Local countdown state for rate-limit errors. The hook only ever sets the
  // initial value once (when the request is denied); the per-second decrement
  // is component-local so the hook does not re-render every second.
  const isRateLimit = kind === 'rate-limit' && retryAfterSeconds != null
  const [secondsLeft, setSecondsLeft] = useState<number>(
    isRateLimit ? retryAfterSeconds : 0,
  )

  // Reset the countdown when a new rate-limit error arrives (e.g., user retries
  // and immediately hits the limit again with a different retryAfterSeconds).
  useEffect(() => {
    if (isRateLimit) {
      setSecondsLeft(retryAfterSeconds)
    }
  }, [isRateLimit, retryAfterSeconds])

  // Per-second decrement while countdown is active
  useEffect(() => {
    if (!isRateLimit) return
    if (secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [isRateLimit, secondsLeft])

  const isDisabled = isRateLimit && secondsLeft > 0

  // Substitute {seconds} in the rate-limit message template. For non-rate-limit
  // kinds, the message is passed through unchanged.
  const displayedMessage =
    isRateLimit && message.includes('{seconds}')
      ? message.replace('{seconds}', String(secondsLeft))
      : message

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
      <p className="text-sm font-medium text-white">Something went wrong</p>
      <p className="mt-1 max-w-xs text-xs text-white/50">{displayedMessage}</p>
      <button
        type="button"
        onClick={isDisabled ? undefined : onRetry}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-40 disabled:cursor-not-allowed"
        data-error-kind={kind}
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  )
}
```

**Critical preservation checks against existing tests** (`ExplainSubViewError.test.tsx`):

- Test 1 ("renders the passed message") — `displayedMessage` for non-rate-limit kinds equals `message` verbatim → still passes
- Test 2 ("renders the 'Something went wrong' heading") — heading unchanged → still passes
- Test 3 (`role="alert"` + `aria-live="assertive"`) — preserved on the outer div → still passes
- Test 4 (`min-h-[44px]` on button) — preserved → still passes
- Test 5 (`onRetry` called on click) — for non-rate-limit kinds, `isDisabled` is false, `onClick={onRetry}` → still passes (verify by running the test)
- Test 6 (`data-error-kind` on button) — preserved → still passes

Update `ExplainSubView.tsx` (line 96):

```tsx
<ExplainSubViewError
  kind={state.errorKind}
  message={state.errorMessage}
  onRetry={state.retry}
  retryAfterSeconds={state.retryAfterSeconds ?? undefined} // NEW
/>
```

Update `ReflectSubView.tsx` similarly (it also uses `ExplainSubViewError`).

**Auth gating:** N/A — component has no auth.

**Responsive behavior:**
- Desktop (1440px): Inherits BB-30/BB-31 layout; countdown text and disabled button look identical to mobile
- Tablet (768px): Same
- Mobile (375px): The countdown line wraps naturally below the heading; retry button retains 44px tap target; disabled state lowers opacity to 40% but does not change hit-box size

**Inline position expectations:** N/A — column-stacked layout, no inline rows

**Guardrails (DO NOT):**

- DO NOT modify the 6 existing tests in `ExplainSubViewError.test.tsx` (acceptance criterion 34).
- DO NOT change the outer div's className, role, aria-live, or padding.
- DO NOT change the AlertCircle icon, the "Something went wrong" heading, or the message paragraph's className.
- DO NOT change the button's existing classes (`min-h-[44px]`, `inline-flex`, `items-center`, `gap-2`, `rounded-full`, `border`, `border-white/20`, `bg-white/10`, `px-5`, `py-2`, `text-sm`, `font-medium`, `text-white`, `transition-colors`, `hover:bg-white/[0.14]`, `focus-visible:*`). Only APPEND `disabled:opacity-40 disabled:cursor-not-allowed`.
- DO NOT change the `RotateCw` icon or the "Try again" button label.
- DO NOT add new colors, fonts, or animation classes (no glow, no pulse, no fade — the spec § "Reduced motion" is explicit).
- DO NOT use `setTimeout` recursive — use `setInterval` with clean-up.
- DO NOT decrement `secondsLeft` below 0.
- DO NOT call `onRetry` while `isDisabled` is true.
- DO NOT mutate the `message` prop (template substitution returns a new string via `replace`).
- DO NOT add a separate `<p>` tag for the countdown — the `displayedMessage` substitution keeps everything in the same paragraph the existing test asserts text on.
- DO NOT remove the `{seconds}` placeholder substitution — the hook stores the literal template, the component substitutes at render time.
- DO NOT pass `retryAfterSeconds` from `ExplainSubView` to the over-limit error case (`isOverLimit`) — only pass it for hook-driven errors.

**Test specifications (appended only — existing 6 tests untouched):**

| # | Test | Type | Description |
|---|------|------|-------------|
| 7 | When `kind === 'rate-limit'` and `retryAfterSeconds === 8`, the message displays "Try again in 8 seconds." | unit | Pass message with `{seconds}` template, assert substituted text. **Acceptance criterion 29.** |
| 8 | The countdown decrements once per second when fake timers advance | unit | `vi.useFakeTimers()`, render with `retryAfterSeconds={5}`, advance 1000ms, assert "in 4 seconds"; advance another 1000ms, assert "in 3 seconds" |
| 9 | The countdown reaches 0 and displays "Try again in 0 seconds." (or equivalent) | unit | Advance timers fully, assert text |
| 10 | The retry button is disabled while `secondsLeft > 0` (countdown active) | unit | Render with `retryAfterSeconds={5}`, query button, assert `disabled` attribute and `aria-disabled="true"`. **Acceptance criterion 30.** |
| 11 | The retry button has `disabled:opacity-40` class | unit | className contains the Tailwind disabled token |
| 12 | The retry button becomes enabled when the countdown reaches 0 | unit | Render with `retryAfterSeconds={1}`, advance 1000ms, button no longer disabled. **Acceptance criterion 30.** |
| 13 | Clicking the retry button while disabled does NOT call `onRetry` | unit | Render disabled, click, `onRetry` mock not called |
| 14 | When `kind !== 'rate-limit'`, the message is rendered verbatim (no template substitution) | unit | Regression guard for the 6 existing kinds |
| 15 | The countdown interval is cleaned up on unmount | unit | Render, unmount, advance timers — no console errors, no setState on unmounted component |
| 16 | The countdown resets when `retryAfterSeconds` prop changes (new rate-limit hit) | unit | Render with 5, change prop to 8, assert displayed text shows 8 |

**Expected state after completion:**

- [ ] `ExplainSubViewError.tsx` accepts the new optional `retryAfterSeconds` prop
- [ ] All 6 existing component tests pass byte-unchanged
- [ ] 10 new countdown tests pass (5 over the spec minimum of 5)
- [ ] `ExplainSubView.tsx` and `ReflectSubView.tsx` pass the prop through
- [ ] `tsc --noEmit` clean

---

### Step 8: Verify the full test suite

**Objective:** Run the full test suite and confirm all pre-existing tests still pass and all BB-32 acceptance criteria are met.

**Files to create/modify:** none — this is a verification step.

**Details:**

Run from `frontend/`:

1. `pnpm test` — full suite. Expected: 0 failures.
2. `pnpm test src/lib/ai` — focused: cache (≥26) + rate-limit (≥17) + errors (≥6 new + existing) + geminiClient (43 existing + ≥12 new = ≥55).
3. `pnpm test src/hooks/bible` — focused: useExplain (16 + ≥4 = ≥20) + useReflect (15 + ≥4 = ≥19). Total hook tests ≥39.
4. `pnpm test src/components/bible/reader` — focused: ExplainSubViewError (6 + ≥10 = ≥16). Other reader tests untouched.
5. `pnpm lint` — 0 errors, 0 warnings on the new files.
6. `pnpm build` — production build succeeds.
7. `tsc --noEmit` — 0 errors.

**Cross-check the acceptance criteria checklist:**

- [ ] AC 1: cache.ts exports the 5 functions ✓
- [ ] AC 2: graceful localStorage failure ✓
- [ ] AC 3: cache key format `bb32-v1:<feature>:<model>:<reference>:<verseTextHash>` ✓
- [ ] AC 4: 7-day TTL ✓
- [ ] AC 5: 2 MB cap with LRU-ish eviction ✓
- [ ] AC 6: ≥25 cache tests ✓ (26)
- [ ] AC 7: rateLimit.ts exports the 4 items + 2 constants ✓
- [ ] AC 8: token-bucket, size 10, refill 10/min ✓
- [ ] AC 9: per-feature buckets ✓
- [ ] AC 10: in-memory only ✓
- [ ] AC 11: ≥15 rate-limit tests ✓ (17)
- [ ] AC 12: RateLimitError class added ✓
- [ ] AC 13: `retryAfterSeconds` field ✓
- [ ] AC 14: 5 existing error classes unchanged ✓
- [ ] AC 15: helper or inline ✓
- [ ] AC 16: signatures unchanged ✓
- [ ] AC 17: cache hit no rate-limit consumption ✓
- [ ] AC 18: cache hit no API call ✓
- [ ] AC 19: rate-limit denial before API call ✓
- [ ] AC 20: errors not cached ✓
- [ ] AC 21: 23 BB-30 generateExplanation tests pass ✓
- [ ] AC 22: 20 BB-31 generateReflection tests pass ✓
- [ ] AC 23: ≥5 helper-integration tests ✓ (12)
- [ ] AC 24: hooks add 'rate-limit' kind ✓
- [ ] AC 25: hooks expose `retryAfterSeconds` ✓
- [ ] AC 26: 31 hook tests pass (verified 2026-04-11, all 31 green) ✓
- [ ] AC 27: new hook rate-limit tests ✓
- [ ] AC 28: ExplainSubViewError accepts `retryAfterSeconds` prop ✓
- [ ] AC 29: live countdown displayed ✓
- [ ] AC 30: button disabled during countdown ✓
- [ ] AC 31: countdown is component-local ✓
- [ ] AC 32: disclaimer/loading/success/sub-view structure unchanged ✓
- [ ] AC 33: action sheet/registry/reader/prompts/SDK init unchanged ✓
- [ ] AC 34: 261 BB-30/BB-31 tests pass ✓ (run full suite)
- [ ] AC 35: ≥60 new BB-32 tests total ✓ (26 + 17 + 6 + 12 + 8 + 10 = 79)
- [ ] AC 36: zero new auth gates ✓
- [ ] AC 37: cache failures degrade silently ✓
- [ ] AC 38: rate-limit copy mentions specific seconds ✓
- [ ] AC 39: zero raw hex values ✓ (no new hex; uses existing Tailwind tokens)
- [ ] AC 40: pre-existing failing tests not touched ✓
- [ ] AC 41: cache hit instant on second tap ✓
- [ ] AC 42: 11 rapid passages → 11th hits rate limit ✓
- [ ] AC 43: 60 seconds idle → bucket refills ✓
- [ ] AC 44: Explain and Reflect rate limits independent ✓
- [ ] AC 45: 16 prompt-test passages → 16 unique keys ✓
- [ ] AC 46: 11-local-storage-keys.md updated ✓ (Step 9)

**Auth gating:** N/A — verification step.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT modify any test to make it pass. If a pre-existing test fails, investigate and revert the offending change.
- DO NOT skip any acceptance criterion check.
- DO NOT touch any pre-existing failing test (acceptance criterion 40).
- DO NOT commit if `pnpm build` or `pnpm test` fail.

**Test specifications:** N/A — runs existing tests only.

**Expected state after completion:**

- [ ] `pnpm test` is green
- [ ] `pnpm lint` is clean
- [ ] `pnpm build` succeeds
- [ ] `tsc --noEmit` is clean
- [ ] All 46 acceptance criteria are checked

---

### Step 9: Document the new localStorage key family

**Objective:** Add the AI Cache section to `11-local-storage-keys.md` per acceptance criterion 46. This is the only documentation file BB-32 must update.

**Files to create/modify:**
- `.claude/rules/11-local-storage-keys.md` — APPEND a new section

**Details:**

After the existing "Bible Reader" section (or in a logical location near other Bible-redesign keys), add:

```markdown
### AI Cache (BB-32)

Cache entries for AI features (Explain this passage, Reflect on this passage). Uses the `bb32-v1:` prefix instead of `wr_` because BB-32 entries are namespaced as a self-contained pool managed by the cache module's eviction and version logic — same exception precedent as the `bible:` prefix.

| Key | Type | Feature |
|-----|------|---------|
| `bb32-v1:explain:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | `{v: 1, feature: 'explain', model: string, reference: string, content: string, createdAt: number}` | Explain this passage cache (BB-30 + BB-32) |
| `bb32-v1:reflect:gemini-2.5-flash-lite:<reference>:<verseTextHash>` | `{v: 1, feature: 'reflect', model: string, reference: string, content: string, createdAt: number}` | Reflect on this passage cache (BB-31 + BB-32) |

- **TTL:** 7 days from `createdAt`
- **Total cap:** 2 MB across all `bb32-v1:*` entries; oldest entries evicted (LRU-ish by `createdAt`) when the cap is exceeded
- **Cleanup:** `clearExpiredAICache()` sweeps expired and version-mismatched entries
- **Hash:** verse text hashed via DJB2 (non-cryptographic, base-36)
- **Version:** key prefix `bb32-v1` allows future invalidation by bumping the version
```

**Auth gating:** N/A — documentation update.

**Responsive behavior:** N/A: no UI impact.

**Guardrails (DO NOT):**

- DO NOT add any other localStorage keys to this file.
- DO NOT modify any other section of `11-local-storage-keys.md`.
- DO NOT use the `wr_` prefix in the documentation — `bb32-v1:` is intentional.
- DO NOT add this to the `bible:` section — BB-32 is a separate namespace.

**Test specifications:** N/A — documentation only.

**Expected state after completion:**

- [ ] `11-local-storage-keys.md` includes the new "AI Cache (BB-32)" section
- [ ] No other section of the file is modified

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Cache module + ≥25 tests |
| 2 | — | Rate-limit module + ≥15 tests (independent of cache) |
| 3 | — | RateLimitError class + tests (independent of cache + rate-limit) |
| 4 | 1, 2, 3 | Wire cache + rate-limit into geminiClient (helper extraction or inline fallback) |
| 5 | 4 | Append helper-integration tests to geminiClient.test.ts |
| 6 | 3, 5 | Update both hooks for `'rate-limit'` error kind + `retryAfterSeconds` |
| 7 | 6 | Update `ExplainSubViewError` for countdown UI + pass-through from sub-views |
| 8 | 1–7 | Full test/lint/build verification + acceptance criteria checklist |
| 9 | — | Documentation (can run in parallel with any other step) |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Create the cache module | [COMPLETE] | 2026-04-11 | `frontend/src/lib/ai/cache.ts` + 26 tests. Self-contained (hardcodes `CURRENT_MODEL`), DJB2 hash base-36 encoded, 7-day TTL, 2 MB soft cap, LRU-ish eviction by `createdAt`. All 26 pass. AC 45 (16-passage determinism + collision check) passes with the two-pass verification added during plan review. |
| 2 | Create the rate-limit module | [COMPLETE] | 2026-04-11 | `frontend/src/lib/ai/rateLimit.ts` + 17 tests. Token bucket, per-feature, in-memory only, on-demand refill (no setInterval), clock-skew safe, fractional accumulation preserved. All 17 pass. |
| 3 | Add RateLimitError to errors.ts | [COMPLETE] | 2026-04-11 | Appended `RateLimitError` using existing `assignCause` pattern. Pre-existing 5 classes byte-unchanged. 6 new tests (5 planned + 1 export-shape regression guard for AC 14). 31/31 errors tests pass. |
| 4 | Wire cache + rate-limit into geminiClient (helper extraction) | [COMPLETE] | 2026-04-11 | **Helper extraction succeeded.** `generateWithPromptAndCacheAndRateLimit` is the single implementation; `generateExplanation`/`generateReflection` are thin wrappers. **Deviation from plan guardrail (documented):** The first test run had 35 failures from BB-32 cache/rate-limit state bleeding across the existing 43 tests (tests 9+ drained the 10-token bucket; repeat-fixture tests returned cached results instead of calling the mocked SDK). Two minimal additive fixes (neither touches any `it()` block): (a) the existing `beforeEach` in `geminiClient.test.ts` was extended to call `clearAllAICache()` + `resetRateLimitForTests()` — the same pattern Step 5 already planned for new describes, applied earlier; (b) `__resetGeminiClientForTests` was extended to also clear BB-32 state so the mid-test assertion at "__resetGeminiClientForTests clears the memoized client" still sees a fresh SDK instantiation. All 43 pre-existing tests pass byte-unchanged (AC 21, 22, 34). Inline Variant (4b) was NOT triggered. |
| 4b | INLINE VARIANT (fallback) | [NOT USED] | — | Helper extraction succeeded; fallback not needed. |
| 5 | Append helper-integration tests to geminiClient.test.ts | [COMPLETE] | 2026-04-11 | 11 new tests appended (plan minimum 5). Covers: cache hit no SDK / no rate-limit consumption / shape parity; rate-limit denial after 11 rapid calls, `retryAfterSeconds > 0`, Explain/Reflect independence; network/safety/api errors not cached; `__resetGeminiClientForTests` also clears cache. **54/54 geminiClient tests pass.** |
| 6 | Update both hooks to handle RateLimitError | [COMPLETE] | 2026-04-11 | Both hooks gained: `RateLimitError` import, `'rate-limit'` in the error-kind union, `retryAfterSeconds: number \| null` on state, `ERROR_COPY['rate-limit']` entry with the `{seconds}` placeholder (now exported so tests can assert it), `classifyError` rate-limit check at the TOP, initial/loading/success states carry `retryAfterSeconds: null`, error branch populates it from `err.retryAfterSeconds` when `err instanceof RateLimitError`. 31 pre-existing hook tests byte-unchanged; 10 new tests appended (5 per hook). **41/41 hook tests pass.** |
| 7 | Update ExplainSubViewError for countdown UI | [COMPLETE] | 2026-04-11 | Added optional `retryAfterSeconds` prop; local `useState` countdown initialized from the prop; `useEffect` with `setInterval(1000)` ticks and cleans up on unmount / kind change; separate `useEffect` resets countdown when prop changes mid-error. Button gains `disabled:opacity-40 disabled:cursor-not-allowed`, `disabled` attribute, `aria-disabled={isDisabled \|\| undefined}` (the `\|\| undefined` is load-bearing — non-rate-limit renders must NOT carry `aria-disabled` or they'd break pre-existing tests). `{seconds}` substituted at render time via `message.replace('{seconds}', String(secondsLeft))` only when `kind === 'rate-limit'`. Both `ExplainSubView.tsx` and `ReflectSubView.tsx` now pass `retryAfterSeconds={state.retryAfterSeconds ?? undefined}`. 11 new tests appended. **17/17 ExplainSubViewError tests pass; all 283 reader component tests pass.** |
| 8 | Verify the full test suite | [COMPLETE] | 2026-04-11 | **BB-32 scope (10 files, 233 tests): all green.** `npx tsc --noEmit`: clean. `pnpm build`: succeeds in 10.49s, no new warnings. `pnpm lint`: 21 problems — **all 21 pre-existing on baseline 79b4987** (verified via `git stash`), zero introduced by BB-32. Full suite `pnpm test`: 7261 pass + 46 fail across 8 files (BibleReaderAudio, BibleReaderHighlights, BibleReaderNotes, BibleLanding, Journal, MeditateLanding, JournalSearchFilter, JournalMilestones) — **all 46 failures pre-existing on baseline** (verified via `git stash`); caused by unrelated `useReadingContext` mock issue and JournalSearchFilter article-count drift. None touch any file BB-32 modified. Per AC 40 these are NOT touched. |
| 9 | Document the new localStorage key family | [COMPLETE] | 2026-04-11 | Added "### AI Cache (BB-32)" section to `.claude/rules/11-local-storage-keys.md` immediately after the `bible:plans` row. Documents both key patterns, the `StoredEntry` value shape, TTL, cap, cleanup functions, hash function, version prefix, failure mode, and "errors not cached" rule. Meets AC 46. |

### Acceptance Criteria Checklist (all 46)

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | cache.ts exports 5 functions | ✓ | `cache.ts` named exports |
| 2 | graceful localStorage failure (no-op on throw/undefined) | ✓ | cache tests 19, 20 |
| 3 | key format `bb32-v1:<feature>:<model>:<reference>:<verseTextHash>` | ✓ | cache test "key format" |
| 4 | 7-day TTL | ✓ | cache tests 7, 8 |
| 5 | 2 MB cap with LRU-ish eviction | ✓ | cache tests 16, 17 |
| 6 | ≥25 cache tests | ✓ | 26 |
| 7 | rateLimit.ts exports 4 functions + 2 constants | ✓ | `rateLimit.ts` named exports |
| 8 | token-bucket size 10, refill 10/min | ✓ | rateLimit tests 12, 13 |
| 9 | per-feature buckets | ✓ | rateLimit tests 6, 7 |
| 10 | in-memory only (no localStorage import) | ✓ | `rateLimit.ts` has no `localStorage` reference |
| 11 | ≥15 rate-limit tests | ✓ | 17 |
| 12 | RateLimitError class added | ✓ | `errors.ts` |
| 13 | `retryAfterSeconds` field | ✓ | errors tests "exposes retryAfterSeconds" |
| 14 | 5 existing error classes unchanged | ✓ | errors test "module exports exactly 6 error classes" |
| 15 | helper extracted (not inlined) | ✓ | Step 4 |
| 16 | public signatures unchanged | ✓ | all 43 pre-existing geminiClient tests pass |
| 17 | cache hit no rate-limit consumption | ✓ | Step 5 "cache hit does NOT consume a rate-limit token" |
| 18 | cache hit no SDK call | ✓ | Step 5 "returns cached result on second call without firing the SDK" |
| 19 | rate-limit denial before SDK call | ✓ | Step 5 "throws RateLimitError after the 11th rapid call" |
| 20 | errors not cached | ✓ | Step 5 "network/safety/api errors are not cached" |
| 21 | 23 BB-30 generateExplanation tests pass unchanged | ✓ | 43 geminiClient tests all green |
| 22 | 20 BB-31 generateReflection tests pass unchanged | ✓ | same run |
| 23 | ≥5 helper-integration tests | ✓ | 11 |
| 24 | hooks add `'rate-limit'` kind | ✓ | hook tests "maps RateLimitError to the rate-limit kind" |
| 25 | hooks expose `retryAfterSeconds` | ✓ | hook tests "exposes retryAfterSeconds from the RateLimitError" |
| 26 | 31 hook tests pass unchanged | ✓ | 31 pre-existing + 10 new = 41/41 |
| 27 | new hook rate-limit tests | ✓ | 10 |
| 28 | ExplainSubViewError accepts `retryAfterSeconds` prop | ✓ | new interface field |
| 29 | live countdown displayed | ✓ | component test "substitutes {seconds}" + "decrements the countdown" |
| 30 | button disabled during countdown | ✓ | component tests "disabled while countdown is active" + "becomes enabled when countdown reaches 0" |
| 31 | countdown component-local (hook does not tick) | ✓ | countdown lives in local `useState` + `useEffect`; hook has no setInterval |
| 32 | disclaimer/loading/success/sub-view structure unchanged | ✓ | ExplainSubViewDisclaimer, ExplainSubViewLoading byte-unchanged; ExplainSubView only added one prop pass |
| 33 | action sheet/registry/reader/prompts/SDK init unchanged | ✓ | verseActionRegistry, VerseActionSheet, BibleReader, prompts/*, `getClient()` byte-unchanged |
| 34 | 261 BB-30/BB-31 tests pass unchanged | ✓ | BB-32 scope all green; bible hooks 103 green; verseActionRegistry untouched |
| 35 | ≥60 new BB-32 tests | ✓ | **81 new** (26 cache + 17 rate-limit + 6 errors + 11 geminiClient + 10 hook + 11 component) |
| 36 | zero new auth gates | ✓ | no `useAuth`/`useAuthModal` imports added |
| 37 | cache failures degrade silently | ✓ | cache tests 19, 20 |
| 38 | rate-limit copy mentions specific seconds | ✓ | `{seconds}` placeholder + component substitution |
| 39 | zero raw hex values | ✓ | no new hex; Tailwind tokens only |
| 40 | pre-existing failing tests not touched | ✓ | 46 baseline failures left in place, verified via git stash |
| 41 | instant cache hit (no spinner) | ✓ | Step 5 "returns cached result on second call" |
| 42 | 11 rapid passages → 11th hits rate limit | ✓ | Step 5 "throws RateLimitError after the 11th rapid call" |
| 43 | 60 sec idle → bucket refills | ✓ | rateLimit test "after 60 seconds idle, the bucket fully refills to 10" |
| 44 | Explain/Reflect rate limits independent | ✓ | rateLimit test "per-feature bucket isolation" + Step 5 integration test |
| 45 | 16 prompt-test passages → 16 unique deterministic keys | ✓ | cache test 23 (two-pass determinism assertion added during plan review) |
| 46 | 11-local-storage-keys.md updated | ✓ | Step 9 |
