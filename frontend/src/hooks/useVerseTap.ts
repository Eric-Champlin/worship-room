import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { BibleVerse } from '@/types/bible'
import type { VerseSelection } from '@/types/verse-actions'
import type { VerseRange } from '@/lib/url/parseVerseParam'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseVerseTapOptions {
  containerRef: React.RefObject<HTMLElement | null>
  bookSlug: string
  bookName: string
  chapter: number
  verses: BibleVerse[]
  enabled: boolean
  /** URL-derived verse range (BB-38). Null when no selection. */
  verseRange: VerseRange | null
  /** Called when a new verse is tapped (no prior selection). Fires once per tap. */
  onVerseTap: (verseNumber: number) => void
  /** Called when a verse is tapped while a selection already exists. Receives the computed new range. */
  onExtendSelection: (newStart: number, newEnd: number) => void
}

interface UseVerseTapReturn {
  /** Full VerseSelection object derived from verseRange + verses list, or null. */
  selection: VerseSelection | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_TAP_MAX_TIME = 300
const QUICK_TAP_MAX_DISTANCE = 10
const LONG_PRESS_DELAY = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk up the DOM from target to find the nearest [data-verse] ancestor */
function findVerseSpan(target: EventTarget | null, container: HTMLElement): HTMLElement | null {
  let el = target as HTMLElement | null
  while (el && el !== container) {
    if (el.hasAttribute('data-verse')) return el
    el = el.parentElement
  }
  return null
}

/** Parse verse number from a verse span element */
function parseVerseNumber(span: HTMLElement): number {
  return parseInt(span.getAttribute('data-verse')!, 10)
}

/** Build a VerseSelection from a range */
function buildSelection(
  bookSlug: string,
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number,
  allVerses: BibleVerse[],
): VerseSelection {
  const min = Math.min(startVerse, endVerse)
  const max = Math.max(startVerse, endVerse)
  const verses = allVerses.filter((v) => v.number >= min && v.number <= max)
  return { book: bookSlug, bookName, chapter, startVerse: min, endVerse: max, verses }
}

/**
 * Pure helper: given a current verse range and a newly-tapped verse, compute
 * the extended range. Mirrors the pre-BB-38 shrink/expand behavior of the
 * original internal `extendSelection` function.
 *
 * Exported for direct unit testing.
 */
export function computeExtendedRange(range: VerseRange, verseNumber: number): VerseRange {
  // If verse is at an edge and range > 1, shrink
  if (range.start !== range.end) {
    if (verseNumber === range.start) {
      return { start: range.start + 1, end: range.end }
    }
    if (verseNumber === range.end) {
      return { start: range.start, end: range.end - 1 }
    }
  }
  // Expand range to include the new verse
  return {
    start: Math.min(range.start, verseNumber),
    end: Math.max(range.end, verseNumber),
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * BB-38: Refactored to derive verse selection from URL-driven state.
 *
 * The hook is now a thin pointer-event handler that:
 *   1. Derives the full VerseSelection object from the `verseRange` prop +
 *      the current `verses` list (no internal state)
 *   2. Calls `onVerseTap(verseNumber)` when the user taps a verse with no
 *      prior selection
 *   3. Calls `onExtendSelection(newStart, newEnd)` when the user taps a verse
 *      while a selection already exists
 *
 * The pre-BB-38 version owned `selection`, `isSheetOpen`, `closeSheet`, and
 * `extendSelection` as internal state and used raw `history.pushState` /
 * `popstate` / `history.back()` to bridge React state with browser history.
 * All of that has been removed — URL-driven history via React Router handles
 * the browser-back semantics in the consumer (`BibleReader.tsx`).
 */
export function useVerseTap(options: UseVerseTapOptions): UseVerseTapReturn {
  const {
    containerRef,
    bookSlug,
    bookName,
    chapter,
    verses,
    enabled,
    verseRange,
    onVerseTap,
    onExtendSelection,
  } = options

  // Derive the full VerseSelection from the URL range + current verses
  const selection: VerseSelection | null = useMemo(() => {
    if (!verseRange) return null
    return buildSelection(bookSlug, bookName, chapter, verseRange.start, verseRange.end, verses)
  }, [verseRange, bookSlug, bookName, chapter, verses])

  // Pointer tracking refs
  const pointerStart = useRef<{
    x: number
    y: number
    time: number
    target: EventTarget | null
  } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs fresh so the pointer effect can read current values without re-subscribing
  const verseRangeRef = useRef(verseRange)
  const onVerseTapRef = useRef(onVerseTap)
  const onExtendSelectionRef = useRef(onExtendSelection)

  useEffect(() => {
    verseRangeRef.current = verseRange
  }, [verseRange])

  useEffect(() => {
    onVerseTapRef.current = onVerseTap
  }, [onVerseTap])

  useEffect(() => {
    onExtendSelectionRef.current = onExtendSelection
  }, [onExtendSelection])

  // ---------------------------------------------------------------------------
  // Dispatch helpers
  // ---------------------------------------------------------------------------

  const dispatchTap = useCallback((verseNumber: number) => {
    const currentRange = verseRangeRef.current
    if (currentRange) {
      const next = computeExtendedRange(currentRange, verseNumber)
      onExtendSelectionRef.current(next.start, next.end)
    } else {
      onVerseTapRef.current(verseNumber)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Pointer event handlers (event delegation)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    const clearLongPress = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now(), target: e.target }

      // Start long-press timer
      clearLongPress()
      const verseSpan = findVerseSpan(e.target, container)
      if (verseSpan) {
        longPressTimer.current = setTimeout(() => {
          longPressTimer.current = null
          const num = parseVerseNumber(verseSpan)
          dispatchTap(num)
        }, LONG_PRESS_DELAY)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!pointerStart.current) return
      const dx = e.clientX - pointerStart.current.x
      const dy = e.clientY - pointerStart.current.y
      if (Math.sqrt(dx * dx + dy * dy) > QUICK_TAP_MAX_DISTANCE) {
        clearLongPress()
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      clearLongPress()

      if (!pointerStart.current) return
      const start = pointerStart.current
      pointerStart.current = null

      // Quick-tap detection
      const elapsed = Date.now() - start.time
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (elapsed > QUICK_TAP_MAX_TIME || distance > QUICK_TAP_MAX_DISTANCE) return

      // Guard: text selection active
      const sel = window.getSelection()
      if (sel && sel.toString().length > 0) return

      // Find verse span
      const verseSpan = findVerseSpan(e.target, container)
      if (!verseSpan) return

      const verseNumber = parseVerseNumber(verseSpan)
      dispatchTap(verseNumber)
    }

    const handleContextMenu = (e: Event) => {
      // Suppress context menu while long-press timer is active
      if (longPressTimer.current) {
        e.preventDefault()
      }
    }

    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', handlePointerUp)
    container.addEventListener('contextmenu', handleContextMenu)

    return () => {
      clearLongPress()
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', handlePointerUp)
      container.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [containerRef, enabled, dispatchTap])

  return { selection }
}
