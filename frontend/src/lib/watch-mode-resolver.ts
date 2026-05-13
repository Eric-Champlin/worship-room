import type { WatchPreference } from '@/types/settings'

/**
 * Spec 6.4 — Watch hour predicate.
 * Returns true for 23:00 through 04:59 (inclusive start, exclusive end).
 * 6-hour span: 23, 0, 1, 2, 3, 4.
 *
 * NOT a 9pm–6am window (that's Night Mode 6.3). Watch is tighter.
 *
 * Defensive fallback: returns false for any invalid hour (NaN, negative,
 * out-of-range >=24). Pure function — no time-of-day side effects.
 */
export function isWatchHour(hour: number): boolean {
  if (!Number.isInteger(hour) || hour < 0 || hour >= 24) return false
  return hour >= 23 || hour < 5
}

/**
 * Spec 6.4 — Watch active resolver.
 *
 * Composes preference, current hour, and Night Mode state to determine
 * whether Watch is active right now.
 *
 * Truth table:
 *  - preference 'off' → always false (Gate-G-FAIL-CLOSED-OPT-IN)
 *  - preference 'on'  → isWatchHour(hour)
 *  - preference 'auto' → isWatchHour(hour) AND nightModeActive
 *
 * Pure function. Fail-closed on any invalid input.
 */
export function resolveWatchModeActive(
  preference: WatchPreference,
  hour: number,
  nightModeActive: boolean,
): boolean {
  if (preference === 'off') return false
  const inWatchHours = isWatchHour(hour)
  if (!inWatchHours) return false
  if (preference === 'on') return true
  if (preference === 'auto') return nightModeActive
  return false
}
