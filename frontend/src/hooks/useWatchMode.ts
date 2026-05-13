import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import { useNightMode } from './useNightMode'
import { resolveWatchModeActive } from '@/lib/watch-mode-resolver'
import type { WatchPreference } from '@/types/settings'

export interface UseWatchModeReturn {
  /** Is Watch active right now (preference + hours + Night Mode resolution). */
  active: boolean
  /**
   * Why Watch is active right now (or would be):
   *   'auto'   — preference 'auto' AND Night Mode active
   *   'manual' — preference 'on'  (independent of Night Mode)
   * Always one of the two literals; defaults to 'auto' when preference is 'off'.
   */
  source: 'auto' | 'manual'
  /** User's stored preference (settings.prayerWall.watchEnabled). */
  userPreference: WatchPreference
  /**
   * v1 invariant: true (no feed slicing wired yet).
   * 6.4b toggles this to false once classifier + slicing ship.
   * Forward-compat signal so consumers don't infer slicing semantics from v1.
   */
  degraded: boolean
}

function readCurrentHour(): number {
  try {
    return new Date().getHours()
  } catch {
    return 12 // safe daytime fallback if Date() throws (impossible but defensive)
  }
}

/**
 * Spec 6.4 — 3am Watch active-state hook.
 *
 * Composes:
 *   - useSettings()    for user preference (settings.prayerWall.watchEnabled)
 *   - useNightMode()   for Night Mode state ('auto' resolution branch)
 *   - browser-local hour via own 60s setInterval (Plan-Time Divergence #1)
 *
 * Returns active=false whenever any input is in a fail-closed state
 * (settings load error, undefined preference, invalid hour, hook not ready).
 *
 * Plan-Time Divergence #1: this hook runs its OWN 60s setInterval rather than
 * inheriting useNightMode's tick. useNightMode does not expose `hour` and
 * Files-NOT-to-Modify forbids modifying it. Two passive 60s timers per page
 * is negligible cost.
 */
export function useWatchMode(): UseWatchModeReturn {
  const settingsHook = useSettings()
  const nightMode = useNightMode()
  const [hour, setHour] = useState<number>(() => readCurrentHour())

  useEffect(() => {
    const id = setInterval(() => {
      setHour(readCurrentHour())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  // Fail-closed defaults (Gate-G-FAIL-CLOSED-OPT-IN)
  let userPreference: WatchPreference = 'off'
  try {
    const stored = settingsHook?.settings?.prayerWall?.watchEnabled
    if (stored === 'off' || stored === 'auto' || stored === 'on') {
      userPreference = stored
    }
  } catch {
    userPreference = 'off'
  }

  const active = resolveWatchModeActive(userPreference, hour, nightMode.active)
  const source: 'auto' | 'manual' = userPreference === 'on' ? 'manual' : 'auto'

  return {
    active,
    source,
    userPreference,
    degraded: true, // v1 invariant — 6.4b flips this to false
  }
}
