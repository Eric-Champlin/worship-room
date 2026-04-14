import { useCallback, useRef } from 'react'

interface UseLongPressResult {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerUp: () => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerCancel: () => void
}

export function useLongPress(
  callback: (e: React.PointerEvent) => void,
  delay = 400,
): UseLongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  const savedEvent = useRef<React.PointerEvent | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startPos.current = null
    savedEvent.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      startPos.current = { x: e.clientX, y: e.clientY }
      savedEvent.current = e
      timerRef.current = setTimeout(() => {
        if (savedEvent.current) {
          callback(savedEvent.current)
        }
        clear()
      }, delay)
    },
    [callback, delay, clear],
  )

  const onPointerUp = useCallback(() => {
    clear()
  }, [clear])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current) return
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clear()
      }
    },
    [clear],
  )

  const onPointerCancel = useCallback(() => {
    clear()
  }, [clear])

  return { onPointerDown, onPointerUp, onPointerMove, onPointerCancel }
}
