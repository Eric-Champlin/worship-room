import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseVerseParam, formatVerseRange, type VerseRange } from '@/lib/url/parseVerseParam'

interface UseVerseSelectionReturn {
  /** Current verse selection from URL, or null if no valid ?verse= param. */
  verseRange: VerseRange | null
  /** Push a new verse selection to the URL (history push). */
  setVerse: (start: number, end?: number) => void
  /** Clear the verse selection from the URL (also removes ?action=). */
  clearVerse: () => void
}

/**
 * BB-38: Reads and writes the ?verse= query parameter as the source of truth
 * for the Bible reader's persistent verse selection state.
 *
 * Reads are validated via parseVerseParam — invalid values return null and are
 * NOT auto-corrected in the URL. The caller decides whether to rewrite on the
 * next state change.
 *
 * Writes push a new history entry (navigate push, not replace).
 *
 * BB-38 rule: when verse is removed, action is also removed (action without
 * verse is meaningless per the edge-case rule). This is the one coupling
 * enforced at the hook level.
 */
export function useVerseSelection(): UseVerseSelectionReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawVerse = searchParams.get('verse')
  const verseRange = parseVerseParam(rawVerse)

  const setVerse = useCallback(
    (start: number, end?: number) => {
      const range: VerseRange = { start, end: end ?? start }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('verse', formatVerseRange(range))
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const clearVerse = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('verse')
        // BB-38 rule: action without verse is meaningless — drop both together
        next.delete('action')
        return next
      },
      { replace: false },
    )
  }, [setSearchParams])

  return { verseRange, setVerse, clearVerse }
}
