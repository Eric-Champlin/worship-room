import { useEffect, useRef } from 'react'

/**
 * Spec 6.8 — active-engagement detector for the Verse-Finds-You reading-time
 * trigger. Counts only foreground+scrolling time (not idle tabs left open).
 *
 * Active when:
 *   - document.visibilityState === 'visible' AND
 *   - a scroll event fired within the last `scrollWindowMs` ms
 *
 * Counter resets when tab is backgrounded; resumes when foregrounded. The
 * `onActive` callback fires AT MOST ONCE per hook lifetime (`fired` ref guards
 * cross-tick); the 24h server-side cooldown handles cross-mount throttling.
 */
export interface UseActiveEngagementOptions {
  /** Total accumulated active time before onActive fires (ms). */
  thresholdMs: number
  /** A scroll event must have fired within this many ms to count as active. */
  scrollWindowMs: number
  /** Callback fired once when accumulated active time crosses thresholdMs. */
  onActive: () => void
}

export function useActiveEngagement(options: UseActiveEngagementOptions): void {
  const { thresholdMs, scrollWindowMs, onActive } = options

  const accumulatedActiveMs = useRef(0)
  const lastTickAt = useRef<number | null>(null)
  const lastScrollAt = useRef<number>(Date.now())
  const fired = useRef(false)
  // Stash callback in ref so we don't re-attach the interval on re-renders
  // when the parent passes a fresh inline arrow function each render.
  const onActiveRef = useRef(onActive)
  useEffect(() => {
    onActiveRef.current = onActive
  }, [onActive])

  useEffect(() => {
    const onScroll = () => {
      lastScrollAt.current = Date.now()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const tick = setInterval(() => {
      const now = Date.now()
      const inForeground = document.visibilityState === 'visible'
      const recentScroll = now - lastScrollAt.current < scrollWindowMs

      if (inForeground && recentScroll && lastTickAt.current != null) {
        accumulatedActiveMs.current += now - lastTickAt.current
      }
      lastTickAt.current = now

      if (!fired.current && accumulatedActiveMs.current >= thresholdMs) {
        fired.current = true
        onActiveRef.current()
      }
    }, 1000)

    return () => {
      window.removeEventListener('scroll', onScroll)
      clearInterval(tick)
    }
  }, [thresholdMs, scrollWindowMs])
}
