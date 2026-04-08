import { useCallback, useRef } from 'react'

export function useLongPress(
  callback: () => void,
  options?: { threshold?: number },
): {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  onTouchCancel: () => void
  /** True after the long-press callback has fired (until the next touchstart). */
  didFire: React.RefObject<boolean>
} {
  const threshold = options?.threshold ?? 500
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const onTouchStart = useCallback(
    (_e: React.TouchEvent) => {
      firedRef.current = false
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        callback()
      }, threshold)
    },
    [callback, threshold],
  )

  const onTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onTouchCancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { onTouchStart, onTouchEnd, onTouchCancel, didFire: firedRef }
}
