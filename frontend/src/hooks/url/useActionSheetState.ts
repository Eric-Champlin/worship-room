import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { validateAction, type DeepLinkableAction } from '@/lib/url/validateAction'

interface UseActionSheetStateReturn {
  /** Current sub-view action from URL, or null if no valid ?action= param. */
  action: DeepLinkableAction | null
  /** Push a new action to the URL (history push). */
  setAction: (action: DeepLinkableAction) => void
  /** Clear the action from the URL while keeping ?verse= intact. */
  clearAction: () => void
}

/**
 * BB-38: Reads and writes the ?action= query parameter for the verse action
 * sheet's sub-view mount state.
 *
 * Reads are validated via validateAction — only actions in the deep-linkable
 * subset are returned. Invalid values return null and are NOT auto-corrected.
 *
 * BB-38 rule: action without verse is meaningless. This hook does NOT enforce
 * that rule on read — it's the caller's job to check that a verse range is
 * also present before mounting a sub-view. `BibleReader.tsx` (Step 4) enforces
 * this invariant via its sheet-open state rules.
 *
 * Writes push a new history entry. clearAction removes only the action
 * parameter and leaves verse intact (so back from sub-view returns to the
 * verse-selected state with the sheet still open).
 */
export function useActionSheetState(): UseActionSheetStateReturn {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawAction = searchParams.get('action')
  const action = validateAction(rawAction)

  const setAction = useCallback(
    (a: DeepLinkableAction) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('action', a)
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const clearAction = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('action')
        return next
      },
      { replace: false },
    )
  }, [setSearchParams])

  return { action, setAction, clearAction }
}
