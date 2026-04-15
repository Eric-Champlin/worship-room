/**
 * BB-29 — Continuous playback preference persistence
 *
 * Read/write helpers for the `bb29-v1:continuousPlayback` localStorage key.
 * Mirrors the fail-silent pattern used by BB-26's `audio-cache.ts`: any
 * failure in localStorage (private browsing, quota exceeded, disabled
 * storage) degrades to the default value rather than propagating.
 *
 * The preference defaults to `true` on absent or corrupt values — continuous
 * playback is on by default for new users per BB-29 spec requirement 16.
 */

export const CONTINUOUS_PLAYBACK_KEY = 'bb29-v1:continuousPlayback'

export function readContinuousPlayback(): boolean {
  try {
    const raw = localStorage.getItem(CONTINUOUS_PLAYBACK_KEY)
    if (raw === null) return true
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'boolean') return true
    return parsed
  } catch {
    return true
  }
}

export function writeContinuousPlayback(value: boolean): void {
  try {
    localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, JSON.stringify(value))
  } catch {
    /* private browsing / quota exceeded — fail silently */
  }
}
