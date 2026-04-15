/**
 * BB-44 — Read-along verse highlighting preference persistence
 *
 * Read/write helpers for the `bb44-v1:readAlong` localStorage key.
 * Mirrors the fail-silent pattern used by BB-29's `continuous-playback.ts`:
 * any failure in localStorage (private browsing, quota exceeded, disabled
 * storage) degrades to the default value rather than propagating.
 *
 * The preference defaults to `true` on absent or corrupt values — read-along
 * is on by default for new users per BB-44 spec requirement 19.
 */

export const READ_ALONG_KEY = 'bb44-v1:readAlong'

export function readReadAlong(): boolean {
  try {
    const raw = localStorage.getItem(READ_ALONG_KEY)
    if (raw === null) return true
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'boolean') return true
    return parsed
  } catch {
    return true
  }
}

export function writeReadAlong(value: boolean): void {
  try {
    localStorage.setItem(READ_ALONG_KEY, JSON.stringify(value))
  } catch {
    /* private browsing / quota exceeded — fail silently */
  }
}
