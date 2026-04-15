/**
 * BB-44 — Auto-scroll hook for read-along verse highlighting.
 *
 * Scrolls the browser window to keep the currently-narrated verse
 * visible at roughly the top third of the viewport. Detects manual
 * user scrolling and pauses auto-scroll for USER_SCROLL_PAUSE_MS,
 * then resumes tracking.
 *
 * The hook distinguishes its own programmatic scrolls from user
 * scrolls via an `isAutoScrollingRef` flag so manual-scroll detection
 * doesn't trigger on auto-scroll events.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const USER_SCROLL_PAUSE_MS = 5000
const AUTO_SCROLL_SETTLE_MS = 600

interface UseReadAlongScrollOptions {
  readAlongVerse: number | null
  enabled: boolean
}

export function useReadAlongScroll({ readAlongVerse, enabled }: UseReadAlongScrollOptions) {
  const reducedMotion = useReducedMotion()
  const isAutoScrollingRef = useRef(false)
  const userIsScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevVerseRef = useRef<number | null>(null)

  const scrollToVerse = useCallback(
    (verseNumber: number) => {
      const el = document.getElementById(`verse-${verseNumber}`)
      if (!el) return

      const rect = el.getBoundingClientRect()
      const targetY = window.innerHeight / 3
      const scrollDelta = rect.top - targetY

      // Skip if already in viewport within tolerance
      if (Math.abs(scrollDelta) < 50) return

      isAutoScrollingRef.current = true
      window.scrollBy({
        top: scrollDelta,
        behavior: reducedMotion ? 'instant' : 'smooth',
      })
      setTimeout(() => {
        isAutoScrollingRef.current = false
      }, AUTO_SCROLL_SETTLE_MS)
    },
    [reducedMotion],
  )

  // Manual scroll detection
  useEffect(() => {
    if (!enabled) return

    const onScroll = () => {
      if (isAutoScrollingRef.current) return // Ignore programmatic scrolls
      userIsScrollingRef.current = true
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        userIsScrollingRef.current = false
        // After user stops scrolling, scroll back to current verse
        if (prevVerseRef.current !== null) {
          scrollToVerse(prevVerseRef.current)
        }
      }, USER_SCROLL_PAUSE_MS)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [enabled, scrollToVerse])

  // Auto-scroll when verse changes
  useEffect(() => {
    if (!enabled || readAlongVerse === null) {
      prevVerseRef.current = null
      return
    }

    prevVerseRef.current = readAlongVerse

    // Don't auto-scroll if user is actively scrolling
    if (userIsScrollingRef.current) return

    scrollToVerse(readAlongVerse)
  }, [readAlongVerse, enabled, scrollToVerse])

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [])
}
