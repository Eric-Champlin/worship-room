import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type MyBibleViewId = 'all' | 'highlights' | 'notes' | 'bookmarks' | 'daily-hub'

const VALID_VIEWS: readonly MyBibleViewId[] = [
  'all',
  'highlights',
  'notes',
  'bookmarks',
  'daily-hub',
]
const DEFAULT_VIEW: MyBibleViewId = 'all'

function isValidView(value: string | null): value is MyBibleViewId {
  return value !== null && (VALID_VIEWS as readonly string[]).includes(value)
}

interface UseMyBibleViewReturn {
  view: MyBibleViewId
  setView: (view: MyBibleViewId) => void
}

/**
 * BB-38: Reads and writes the ?view= query parameter for the My Bible page.
 *
 * The default view ('all') is omitted from the URL to keep URLs clean —
 * setting view back to 'all' deletes the parameter entirely.
 */
export function useMyBibleView(): UseMyBibleViewReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('view')
  const view: MyBibleViewId = isValidView(raw) ? raw : DEFAULT_VIEW

  const setView = useCallback(
    (nextView: MyBibleViewId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (nextView === DEFAULT_VIEW) {
            next.delete('view')
          } else {
            next.set('view', nextView)
          }
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  return { view, setView }
}
