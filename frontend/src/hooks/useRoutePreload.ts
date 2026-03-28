import { useEffect } from 'react'

/**
 * Preloads route chunks after the current page finishes rendering.
 * Uses requestIdleCallback (with setTimeout fallback for Safari)
 * to avoid competing with the current page's resources.
 */
export function useRoutePreload(importFns: Array<() => Promise<unknown>>) {
  useEffect(() => {
    const schedulePreload = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 2000)

    const id = schedulePreload(() => {
      importFns.forEach((fn) => {
        fn().catch(() => {
          // Silently ignore preload failures — they'll be retried on navigation
        })
      })
    })

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id as number)
      } else {
        window.clearTimeout(id as number)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
