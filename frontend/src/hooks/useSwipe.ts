import { useRef, useCallback } from 'react'

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number // minimum px delta to trigger (default 50)
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeOptions): {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
} {
  const touchStartX = useRef<number | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const deltaX = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(deltaX) < threshold) return
      if (deltaX > 0) onSwipeRight?.()
      else onSwipeLeft?.()
    },
    [onSwipeLeft, onSwipeRight, threshold],
  )

  return { onTouchStart, onTouchEnd }
}
