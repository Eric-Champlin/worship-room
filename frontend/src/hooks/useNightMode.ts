import { useEffect, useState } from 'react'
import type { NightModePreference } from '@/types/settings'
import { useSettings } from '@/hooks/useSettings'
import { resolveNightModeActive } from '@/lib/night-mode-resolver'

export const NIGHT_MODE_HINT_KEY = 'wr_night_mode_hint'

export interface UseNightModeReturn {
  active: boolean
  source: 'auto' | 'manual'
  userPreference: NightModePreference
}

function readCurrentHour(): number {
  return new Date().getHours()
}

function writeHint(active: boolean) {
  try {
    localStorage.setItem(NIGHT_MODE_HINT_KEY, active ? 'on' : 'off')
  } catch (_) {
    // private mode / quota — graceful no-op
  }
}

/**
 * Spec 6.3 — Night Mode hook.
 *
 * Derives `active` from `settings.prayerWall.nightMode` + browser hour. Polls
 * every 60s while mounted so the UI flips automatically at the hour boundary.
 * Persists the resolved state to `wr_night_mode_hint` for the no-FOUC inline
 * script on next load.
 *
 * Stable return surface (forward-compat for Spec 6.4 `useWatchMode()`):
 *   - active: boolean
 *   - source: 'auto' | 'manual'
 *   - userPreference: NightModePreference
 */
export function useNightMode(): UseNightModeReturn {
  const { settings } = useSettings()
  const userPreference = settings.prayerWall.nightMode
  const [hour, setHour] = useState<number>(() => readCurrentHour())

  // Polling tick — re-evaluate every 60s while mounted.
  useEffect(() => {
    const id = setInterval(() => {
      setHour(readCurrentHour())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const active = resolveNightModeActive(userPreference, hour)
  const source: 'auto' | 'manual' = userPreference === 'auto' ? 'auto' : 'manual'

  // Reconciliation: persist resolved state to hint key for next-load no-FOUC.
  useEffect(() => {
    writeHint(active)
  }, [active])

  return { active, source, userPreference }
}
