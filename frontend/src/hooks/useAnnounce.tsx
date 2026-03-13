import { useCallback, useRef, useMemo } from 'react'

interface UseAnnounceReturn {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  AnnouncerRegion: () => JSX.Element
}

/**
 * Screen reader announcement hook with debouncing.
 *
 * - "polite" announcements are debounced (300ms) so rapid state changes
 *   produce a single announcement.
 * - "assertive" announcements fire immediately (critical events).
 * - Region text is cleared after 5 seconds to prevent stale content.
 */
export function useAnnounce(): UseAnnounceReturn {
  const politeRef = useRef<HTMLDivElement>(null)
  const assertiveRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (priority === 'assertive') {
        if (assertiveRef.current) {
          assertiveRef.current.textContent = message
        }
        // Clear after 5 seconds
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
        clearTimerRef.current = setTimeout(() => {
          if (assertiveRef.current) assertiveRef.current.textContent = ''
          if (politeRef.current) politeRef.current.textContent = ''
        }, 5000)
        return
      }

      // Debounce polite announcements (300ms)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

      debounceTimerRef.current = setTimeout(() => {
        if (politeRef.current) {
          politeRef.current.textContent = message
        }
        // Clear after 5 seconds
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
        clearTimerRef.current = setTimeout(() => {
          if (politeRef.current) politeRef.current.textContent = ''
          if (assertiveRef.current) assertiveRef.current.textContent = ''
        }, 5000)
      }, 300)
    },
    [],
  )

  // Stable component identity — useMemo ensures React does not remount
  // the DOM nodes on every parent re-render, keeping refs valid.
  const AnnouncerRegion = useMemo(
    () =>
      function AnnouncerRegionInner() {
        return (
          <>
            <div
              ref={politeRef}
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
              data-testid="announce-polite"
            />
            <div
              ref={assertiveRef}
              aria-live="assertive"
              aria-atomic="true"
              className="sr-only"
              data-testid="announce-assertive"
            />
          </>
        )
      },
    [],
  )

  return { announce, AnnouncerRegion }
}
