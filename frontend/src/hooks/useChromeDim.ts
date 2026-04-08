import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const IDLE_TIMEOUT = 4000
const DIM_OPACITY = 0.3

export function useChromeDim() {
  const reducedMotion = useReducedMotion()
  const [opacity, setOpacity] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (reducedMotion) return
    setOpacity(1)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setOpacity(DIM_OPACITY), IDLE_TIMEOUT)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) {
      setOpacity(1)
      return
    }

    // Start the initial timer
    timerRef.current = setTimeout(() => setOpacity(DIM_OPACITY), IDLE_TIMEOUT)

    const handleInteraction = () => resetTimer()

    window.addEventListener('mousemove', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    window.addEventListener('scroll', handleInteraction, { passive: true })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      window.removeEventListener('scroll', handleInteraction)
    }
  }, [reducedMotion, resetTimer])

  return { opacity }
}
