/**
 * BB-26 — Audio cache layer.
 *
 * Two caches live here:
 *
 * 1. A localStorage cache for the `listAudioBibles()` response, keyed as
 *    `bb26-v1:audioBibles`. TTL 7 days. Mirrors the BB-32 cache module's
 *    safe-wrapper pattern but is much smaller (one key). We deliberately
 *    copy the pattern instead of extracting a shared module — premature
 *    abstraction hazard, per plan Step 5 guardrail.
 *
 * 2. An in-memory `Map<string, DbpChapterAudio>` for per-chapter audio URLs,
 *    keyed as `${filesetId}:${book}:${chapter}`. Not persisted because DBP
 *    URLs are signed and may expire — a fresh page load always re-fetches.
 *
 * `loadAudioBibles()` is the stale-while-revalidate public helper that
 * combines the cache and the DBP client: fresh hit returns immediately;
 * on fetch failure the stale cache is returned as a graceful fallback.
 *
 * Storage failure policy: every localStorage operation is wrapped in
 * try/catch. A storage failure (private browsing, quota exceeded, disabled)
 * degrades to no-op. Cache getters never throw.
 */

import { listAudioBibles as fetchAudioBibles } from '@/lib/audio/dbp-client'
import type { AudioBiblesCacheEntry, DbpBible, DbpChapterAudio } from '@/types/bible-audio'

const CACHE_KEY = 'bb26-v1:audioBibles'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const ENTRY_SCHEMA_VERSION = 1

// ─── Safe localStorage wrappers (fail-silent) ────────────────────────────

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private browsing / quota exceeded / storage disabled — degrade silently.
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage disabled — nothing to remove.
  }
}

// ─── Bibles-list cache (localStorage, 7-day TTL) ──────────────────────────

/**
 * Returns cached bibles list, or null on miss/expiry/corruption/failure.
 * Removes the key as a side effect on corruption or version mismatch.
 */
export function getCachedAudioBibles(): DbpBible[] | null {
  const raw = safeLocalStorageGet(CACHE_KEY)
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    safeLocalStorageRemove(CACHE_KEY)
    return null
  }

  if (!isValidEntry(parsed)) {
    safeLocalStorageRemove(CACHE_KEY)
    return null
  }

  if (Date.now() - parsed.createdAt > CACHE_TTL_MS) {
    return null // expired — leave the key so the next setter overwrites it
  }

  return parsed.bibles
}

function isValidEntry(value: unknown): value is AudioBiblesCacheEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.v === ENTRY_SCHEMA_VERSION &&
    typeof v.createdAt === 'number' &&
    Array.isArray(v.bibles)
  )
}

/** Stores bibles list in cache. Fail-silent on storage errors. */
export function setCachedAudioBibles(bibles: DbpBible[]): void {
  const entry: AudioBiblesCacheEntry = {
    v: ENTRY_SCHEMA_VERSION,
    createdAt: Date.now(),
    bibles,
  }
  try {
    safeLocalStorageSet(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // JSON.stringify should never throw for this shape, but belt-and-suspenders.
  }
}

/** Removes the cached bibles list. */
export function clearCachedAudioBibles(): void {
  safeLocalStorageRemove(CACHE_KEY)
}

// ─── Per-chapter audio cache (in-memory Map, not persisted) ───────────────

const chapterAudioCache = new Map<string, DbpChapterAudio>()

function chapterCacheKey(filesetId: string, book: string, chapter: number): string {
  return `${filesetId}:${book}:${chapter}`
}

/** Returns cached chapter audio (in-memory only), or undefined on miss. */
export function getCachedChapterAudio(
  filesetId: string,
  book: string,
  chapter: number,
): DbpChapterAudio | undefined {
  return chapterAudioCache.get(chapterCacheKey(filesetId, book, chapter))
}

/** Stores chapter audio in the in-memory Map. */
export function setCachedChapterAudio(
  filesetId: string,
  book: string,
  chapter: number,
  audio: DbpChapterAudio,
): void {
  chapterAudioCache.set(chapterCacheKey(filesetId, book, chapter), audio)
}

/** Clears all in-memory per-chapter cache. */
export function clearChapterAudioCache(): void {
  chapterAudioCache.clear()
}

// ─── Stale-while-revalidate wrapper ───────────────────────────────────────

/**
 * Loads the audio bibles list, preferring a fresh cache hit. On cache miss
 * or expiry, fetches via the DBP client and updates the cache. On fetch
 * failure, returns stale cache data if any exists (graceful fallback);
 * otherwise rethrows the DbpError.
 */
export async function loadAudioBibles(): Promise<DbpBible[]> {
  const fresh = getCachedAudioBibles()
  if (fresh) return fresh

  try {
    const bibles = await fetchAudioBibles()
    setCachedAudioBibles(bibles)
    return bibles
  } catch (err) {
    // Fall back to any cached entry (even if expired) before rethrowing.
    const raw = safeLocalStorageGet(CACHE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (isValidEntry(parsed)) {
          return parsed.bibles
        }
      } catch {
        // Corrupt cache — fall through to the error.
      }
    }
    throw err
  }
}
