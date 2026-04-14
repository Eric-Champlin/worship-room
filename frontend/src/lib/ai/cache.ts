/**
 * BB-32 — Client-side AI result cache.
 *
 * Standalone, framework-agnostic localStorage cache for AI feature results
 * (Explain this passage, Reflect on this passage). Wraps localStorage with
 * TTL, version handling, and LRU-ish eviction. No React, no SDK, no env.
 *
 * Caller-visible API is three public helpers for read/write plus two
 * housekeeping helpers. Internal helpers (hash, key builder, eviction,
 * storage wrapper) are NOT exported — the surface area is intentionally
 * narrow so future specs can invalidate entries by bumping the version
 * prefix without touching callers.
 *
 * Storage failure policy: every localStorage operation is wrapped in
 * try/catch. A storage failure (private browsing, quota exceeded, disabled)
 * degrades to no-op behavior — the cache becomes a silent pass-through.
 * Callers never observe a thrown error from this module.
 *
 * See `_specs/bb-32-ai-caching-and-rate-limiting.md` § "The cache layer" for
 * the full design rationale.
 */

const CACHE_KEY_PREFIX = 'bb32-v1:'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const CACHE_MAX_BYTES = 2 * 1024 * 1024 // 2 MB soft cap
const ENTRY_SCHEMA_VERSION = 1

/**
 * The model all BB-32 cache entries are keyed against. Hardcoded here (not
 * passed by callers) so the cache API stays at 3 args. If geminiClient.ts
 * ever changes its `MODEL` constant, update both in lockstep — the cache
 * key includes the model segment so old entries will be orphaned and
 * cleaned up by `clearExpiredAICache()` (version mismatch will also catch
 * them on the next read).
 */
const CURRENT_MODEL = 'gemini-2.5-flash-lite'

export type AIFeature = 'explain' | 'reflect'

/**
 * The shape returned by `getCachedAIResult` on a cache hit. Matches the
 * success shape of `generateExplanation` / `generateReflection` so callers
 * can return it directly.
 */
export interface CachedResult {
  content: string
  model: string
}

/**
 * The on-disk JSON shape stored under each `bb32-v1:*` key. The `v` field
 * is the entry schema version (independent of the cache key prefix version
 * `bb32-v1`). Bump `ENTRY_SCHEMA_VERSION` to force `getCachedAIResult` to
 * treat all old entries as misses.
 */
interface StoredEntry {
  v: number
  feature: AIFeature
  model: string
  reference: string
  content: string
  createdAt: number
}

// ─── Internal helpers (not exported) ──────────────────────────────────────

/**
 * DJB2 hash — fast, non-cryptographic, deterministic. Used to compress
 * arbitrary verse text into a compact cache-key segment. The 32-bit result
 * is base-36 encoded for a ~6-7 character string. Collision probability is
 * far below the "16 prompt-test passages" acceptance criterion floor.
 */
function hashString(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  // `>>> 0` converts the signed 32-bit result to unsigned so the base-36
  // encoding doesn't leak a leading minus sign.
  return (h >>> 0).toString(36)
}

function buildCacheKey(
  feature: AIFeature,
  model: string,
  reference: string,
  verseText: string,
): string {
  return `${CACHE_KEY_PREFIX}${feature}:${model}:${reference}:${hashString(verseText)}`
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    const ls = globalThis.localStorage
    if (!ls) return false
    ls.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // ignore — same fail-silent contract as get/set
  }
}

/**
 * Enumerate every localStorage key starting with `CACHE_KEY_PREFIX`. Returns
 * a defensive copy so callers can safely remove entries while iterating.
 */
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

/**
 * Rough byte-size estimate for a localStorage entry. Uses `length * 2` to
 * approximate UTF-16 code units. Overestimates ASCII content (which most
 * AI output is) by ~2x — that's a conservative cap, not a precision
 * requirement. The 2 MB soft limit is a courtesy budget, not a guarantee.
 */
function estimateEntryBytes(key: string, value: string): number {
  return (key.length + value.length) * 2
}

/**
 * Evict oldest entries (by `createdAt`) one at a time until the total
 * cache footprint is at or below `maxBytes`. Corrupt entries are removed
 * as a side effect. Called only from `setCachedAIResult` when a new entry
 * would push the total over `CACHE_MAX_BYTES`.
 */
function evictOldestUntilUnderLimit(maxBytes: number): void {
  const keys = listAllCacheKeys()
  type Row = { key: string; createdAt: number; bytes: number }
  const rows: Row[] = []
  let totalBytes = 0

  for (const key of keys) {
    const raw = safeLocalStorageGet(key)
    if (raw == null) continue
    const bytes = estimateEntryBytes(key, raw)
    totalBytes += bytes
    let createdAt = 0
    try {
      const parsed = JSON.parse(raw) as Partial<StoredEntry>
      createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : 0
    } catch {
      // Corrupt entry — treat as oldest possible so it gets evicted first.
      createdAt = 0
    }
    rows.push({ key, createdAt, bytes })
  }

  if (totalBytes <= maxBytes) return

  // Oldest first — LRU-ish by creation timestamp.
  rows.sort((a, b) => a.createdAt - b.createdAt)

  for (const row of rows) {
    if (totalBytes <= maxBytes) break
    safeLocalStorageRemove(row.key)
    totalBytes -= row.bytes
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Look up a cached AI result by feature + reference + verse text. Returns
 * `null` on miss, on corrupt/expired/version-mismatched entries (which are
 * also removed as a side effect), or on any localStorage failure.
 *
 * **Does not consume a rate-limit token** — callers should check the cache
 * before the rate limiter so repeated requests for the same passage are
 * free.
 */
export function getCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
): CachedResult | null {
  const key = buildCacheKey(feature, CURRENT_MODEL, reference, verseText)
  const raw = safeLocalStorageGet(key)
  if (raw == null) return null

  let parsed: StoredEntry
  try {
    parsed = JSON.parse(raw) as StoredEntry
  } catch {
    safeLocalStorageRemove(key)
    return null
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.v !== ENTRY_SCHEMA_VERSION ||
    typeof parsed.content !== 'string' ||
    typeof parsed.model !== 'string' ||
    typeof parsed.createdAt !== 'number'
  ) {
    safeLocalStorageRemove(key)
    return null
  }

  const age = Date.now() - parsed.createdAt
  if (age > CACHE_TTL_MS || age < 0) {
    // age<0 = clock skew (user changed system clock); treat as expired.
    safeLocalStorageRemove(key)
    return null
  }

  return { content: parsed.content, model: parsed.model }
}

/**
 * Store a successful AI result in the cache. Errors must NEVER be cached —
 * callers should only invoke this on a successful `{content, model}` value.
 *
 * Enforces the 2 MB soft cap by evicting oldest entries before writing. A
 * single entry larger than the cap silently fails (returns without
 * writing) rather than evicting the entire cache to fit it.
 *
 * All failure modes (quota exceeded, disabled storage, oversized entry)
 * return silently — the cache is a courtesy layer, not a guarantee, and a
 * storage failure must never propagate to the UI.
 */
export function setCachedAIResult(
  feature: AIFeature,
  reference: string,
  verseText: string,
  value: CachedResult,
): void {
  const key = buildCacheKey(feature, CURRENT_MODEL, reference, verseText)
  const entry: StoredEntry = {
    v: ENTRY_SCHEMA_VERSION,
    feature,
    model: value.model,
    reference,
    content: value.content,
    createdAt: Date.now(),
  }
  const serialized = JSON.stringify(entry)
  const newEntryBytes = estimateEntryBytes(key, serialized)

  // If this single entry alone exceeds the cap, silently drop it — we
  // cannot make room for it no matter how much we evict.
  if (newEntryBytes > CACHE_MAX_BYTES) return

  const currentBytes = getAICacheStorageBytes()
  if (currentBytes + newEntryBytes > CACHE_MAX_BYTES) {
    evictOldestUntilUnderLimit(CACHE_MAX_BYTES - newEntryBytes)
  }

  safeLocalStorageSet(key, serialized)
}

/**
 * Sweep expired and version-mismatched entries. Returns the number of
 * entries removed. Safe to call repeatedly and from any context (tests,
 * background cleanup, future admin button). Always returns 0 on
 * localStorage failure — never throws.
 */
export function clearExpiredAICache(): number {
  const keys = listAllCacheKeys()
  let cleared = 0
  const now = Date.now()

  for (const key of keys) {
    const raw = safeLocalStorageGet(key)
    if (raw == null) continue
    let parsed: Partial<StoredEntry> | null = null
    try {
      parsed = JSON.parse(raw) as Partial<StoredEntry>
    } catch {
      safeLocalStorageRemove(key)
      cleared++
      continue
    }
    if (
      !parsed ||
      parsed.v !== ENTRY_SCHEMA_VERSION ||
      typeof parsed.createdAt !== 'number' ||
      now - parsed.createdAt > CACHE_TTL_MS ||
      now - parsed.createdAt < 0
    ) {
      safeLocalStorageRemove(key)
      cleared++
    }
  }

  return cleared
}

/**
 * Nuke every `bb32-v1:*` entry. Used by tests for clean setup/teardown and
 * reserved for a future admin "clear cache" surface (no such UI exists in
 * BB-32). Other localStorage keys (`wr_*`, `bible:*`, etc.) are untouched.
 */
export function clearAllAICache(): void {
  const keys = listAllCacheKeys()
  for (const key of keys) {
    safeLocalStorageRemove(key)
  }
}

/**
 * Return the current estimated byte size of all `bb32-v1:*` entries. Used
 * internally by `setCachedAIResult` for eviction decisions and exposed for
 * tests. Returns 0 on localStorage failure.
 */
export function getAICacheStorageBytes(): number {
  const keys = listAllCacheKeys()
  let total = 0
  for (const key of keys) {
    const raw = safeLocalStorageGet(key)
    if (raw == null) continue
    total += estimateEntryBytes(key, raw)
  }
  return total
}
