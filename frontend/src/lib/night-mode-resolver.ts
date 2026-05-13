import type { NightModePreference } from '@/types/settings'

/**
 * Returns true when the hour falls within the Night Mode window
 * (21:00 inclusive to 06:00 exclusive).
 *
 * MIRROR — the same logic is inlined in frontend/index.html for no-FOUC.
 * If you change this function, update the inline script and re-run
 * `night-mode-resolver-parity.test.ts`.
 */
export function isNightHour(hour: number): boolean {
  return hour >= 21 || hour < 6
}

/**
 * Resolves a 3-state preference + browser hour into a boolean active state.
 *
 * MIRROR — the same logic is inlined in frontend/index.html for no-FOUC.
 */
export function resolveNightModeActive(
  preference: NightModePreference,
  hour: number,
): boolean {
  if (preference === 'on') return true
  if (preference === 'off') return false
  return isNightHour(hour)
}
