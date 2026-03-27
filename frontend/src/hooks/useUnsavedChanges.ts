import { useEffect, useCallback } from 'react'

interface UseUnsavedChangesReturn {
  showModal: boolean
  confirmLeave: () => void
  cancelLeave: () => void
}

/**
 * Protects unsaved form changes via the browser's beforeunload event.
 *
 * Note: In-app navigation blocking via useBlocker requires a data router
 * (createBrowserRouter). The app currently uses BrowserRouter, so useBlocker
 * is not available. Once the app migrates to createBrowserRouter (Phase 3+),
 * add useBlocker here for in-app navigation blocking.
 *
 * For now, beforeunload covers tab close / browser back / external navigation.
 */
export function useUnsavedChanges(isDirty: boolean): UseUnsavedChangesReturn {
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    // No-op until data router migration enables useBlocker
  }, [])

  const cancelLeave = useCallback(() => {
    // No-op until data router migration enables useBlocker
  }, [])

  return {
    showModal: false,
    confirmLeave,
    cancelLeave,
  }
}
