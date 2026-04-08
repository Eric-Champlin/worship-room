import { useState, useCallback, useEffect, useRef } from 'react'
import type { BibleVerse } from '@/types/bible'
import type { VerseSelection } from '@/types/verse-actions'

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
}

interface UseVerseTapReturn {
  /** Currently selected verse range (null when no selection) */
  selection: VerseSelection | null
  /** Whether the action sheet should be open */
  isSheetOpen: boolean
  /** Close the sheet and clear selection */
  closeSheet: () => void
  /** Extend selection to a new verse (for multi-verse from sheet) */
  extendSelection: (verseNumber: number) => void
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVerseTap(options: UseVerseTapOptions): UseVerseTapReturn {
  const { containerRef, bookSlug, bookName, chapter, verses, enabled } = options

  const [selection, setSelection] = useState<VerseSelection | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  // Pointer tracking refs
  const pointerStart = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyPushed = useRef(false)

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------

  const openSheet = useCallback(
    (verseNumber: number) => {
      const sel = buildSelection(bookSlug, bookName, chapter, verseNumber, verseNumber, verses)
      setSelection(sel)
      setIsSheetOpen(true)

      // Push history state for browser back dismiss
      if (!historyPushed.current) {
        history.pushState({ verseSheet: true }, '')
        historyPushed.current = true
      }
    },
    [bookSlug, bookName, chapter, verses],
  )

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false)
    setSelection(null)

    // Pop the history entry we pushed
    if (historyPushed.current) {
      historyPushed.current = false
      history.back()
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Multi-verse extension
  // ---------------------------------------------------------------------------

  const extendSelection = useCallback(
    (verseNumber: number) => {
      setSelection((prev) => {
        if (!prev) return prev

        // If verse is at an edge and range > 1, shrink
        if (prev.startVerse !== prev.endVerse) {
          if (verseNumber === prev.startVerse) {
            return buildSelection(bookSlug, bookName, chapter, prev.startVerse + 1, prev.endVerse, verses)
          }
          if (verseNumber === prev.endVerse) {
            return buildSelection(bookSlug, bookName, chapter, prev.startVerse, prev.endVerse - 1, verses)
          }
        }

        // Expand range to include the new verse
        const newStart = Math.min(prev.startVerse, verseNumber)
        const newEnd = Math.max(prev.endVerse, verseNumber)
        return buildSelection(bookSlug, bookName, chapter, newStart, newEnd, verses)
      })
    },
    [bookSlug, bookName, chapter, verses],
  )

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
          if (isSheetOpen) {
            extendSelection(num)
          } else {
            openSheet(num)
          }
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

      if (isSheetOpen) {
        // Sheet already open — extend/modify selection
        // (Shift, Ctrl/Cmd, and plain tap all route through extendSelection
        // which keeps the range contiguous per spec req 13.
        // Desktop drag-to-select deferred to a follow-up spec.)
        extendSelection(verseNumber)
      } else {
        openSheet(verseNumber)
      }
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
  }, [containerRef, enabled, isSheetOpen, openSheet, extendSelection])

  // ---------------------------------------------------------------------------
  // Browser back dismiss
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isSheetOpen) return

    const handlePopState = (e: PopStateEvent) => {
      if (!e.state?.verseSheet) {
        // User pressed back — close sheet without calling history.back() again
        historyPushed.current = false
        setIsSheetOpen(false)
        setSelection(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isSheetOpen])

  // ---------------------------------------------------------------------------
  // Reset on chapter/book change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setSelection(null)
    setIsSheetOpen(false)
    if (historyPushed.current) {
      historyPushed.current = false
      history.back()
    }
  }, [bookSlug, chapter])

  return { selection, isSheetOpen, closeSheet, extendSelection }
}
