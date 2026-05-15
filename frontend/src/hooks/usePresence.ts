import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import type { PresenceResponse } from '@/types/api/presence'

const POLL_INTERVAL_MS = 30_000
const BACKOFF_AFTER_429_MS = 60_000

export interface UsePresenceResult {
  /** Current count, or null if no successful fetch yet OR suppressed. */
  count: number | null
  /** True when polling is paused (suppressed or tab hidden). */
  paused: boolean
}

export interface UsePresenceOptions {
  /**
   * Spec 6.11b — Gate-G-CRISIS-SUPPRESSION. When true, the hook does NOT
   * fetch and returns count=null. The consumer renders nothing.
   */
  suppressed: boolean
}

/**
 * Spec 6.11b — Live Presence polling hook.
 *
 * Polls GET /api/v1/prayer-wall/presence every 30 seconds while the tab is
 * visible. Pauses on `visibilitychange` to hidden, resumes (with one immediate
 * fetch then 30s cadence) on visible. On 429, backs off for 60 seconds before
 * resuming. Suppressed mode (crisis-flagged page) skips all fetching entirely.
 *
 * <p>Anti-pressure design: silent failure on non-429 errors, no toast, no
 * retry storm. Presence is a status signal — best-effort is good enough.
 */
export function usePresence({ suppressed }: UsePresenceOptions): UsePresenceResult {
  const [count, setCount] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const backoffRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    if (suppressed) {
      setPaused(true)
      setCount(null)
      return
    }

    let cancelled = false

    function clearInterval_() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    async function fetchCount() {
      if (cancelled) return
      if (isFetchingRef.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      isFetchingRef.current = true
      try {
        const result = await apiFetch<PresenceResponse>('/api/v1/prayer-wall/presence')
        if (!cancelled) setCount(result.count)
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          // Backoff for 60s, then resume.
          clearInterval_()
          if (backoffRef.current) clearTimeout(backoffRef.current)
          backoffRef.current = setTimeout(() => {
            backoffRef.current = null
            startPolling()
          }, BACKOFF_AFTER_429_MS)
        }
        // Other errors: silent failure. Presence is best-effort.
      } finally {
        isFetchingRef.current = false
      }
    }

    function startPolling() {
      if (cancelled || suppressed) return
      void fetchCount()
      clearInterval_()
      intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS)
    }

    function handleVisibility() {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'visible') {
        setPaused(false)
        startPolling()
      } else {
        setPaused(true)
        clearInterval_()
      }
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility)
      if (document.visibilityState === 'visible') {
        startPolling()
      } else {
        setPaused(true)
      }
    } else {
      // SSR / non-browser fallback — no fetching, just inert state.
      setPaused(true)
    }

    return () => {
      cancelled = true
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility)
      }
      clearInterval_()
      if (backoffRef.current) clearTimeout(backoffRef.current)
    }
  }, [suppressed])

  return { count, paused }
}
