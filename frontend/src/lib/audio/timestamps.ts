/**
 * BB-44 — Verse timestamp processing and in-memory cache.
 *
 * Timestamps map audio playback time to verse numbers, enabling the
 * read-along verse highlighting feature. The binary search runs on
 * every 200ms TICK action and is O(log n) — trivially cheap for
 * the ~50 entries per chapter typical of the DBP dataset.
 *
 * The cache is in-memory only (not persisted to localStorage).
 * Timestamps are small and re-fetched on page refresh.
 */

import type { VerseTimestamp } from '@/types/bible-audio'

/**
 * In-memory cache for chapter timestamps. Keyed by `${filesetId}:${bookCode}:${chapter}`.
 * Not persisted — re-fetched on page refresh. Timestamps are small (~50 entries per chapter).
 */
const timestampCache = new Map<string, VerseTimestamp[]>()

export function getCachedTimestamps(
  filesetId: string,
  bookCode: string,
  chapter: number,
): VerseTimestamp[] | undefined {
  return timestampCache.get(`${filesetId}:${bookCode}:${chapter}`)
}

export function setCachedTimestamps(
  filesetId: string,
  bookCode: string,
  chapter: number,
  timestamps: VerseTimestamp[],
): void {
  timestampCache.set(`${filesetId}:${bookCode}:${chapter}`, timestamps)
}

/** Exposed for tests only — clears the entire in-memory cache. */
export function clearTimestampCache(): void {
  timestampCache.clear()
}

/**
 * Binary search for the active verse at a given playback time.
 * Returns the verse number whose timestamp is the largest value <= currentTime,
 * or null if currentTime is before the first verse.
 */
export function findCurrentVerse(
  timestamps: VerseTimestamp[],
  currentTimeSeconds: number,
): number | null {
  if (!timestamps.length) return null
  if (currentTimeSeconds < timestamps[0].timestamp) return null

  let low = 0
  let high = timestamps.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (timestamps[mid].timestamp <= currentTimeSeconds) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  return timestamps[low].verse
}
