import { useEffect, useRef, useState } from 'react'

interface UseAnimatedCounterOptions {
  target: number
  duration?: number
  delay?: number
  enabled?: boolean
}

export function useAnimatedCounter({
  target,
  duration = 800,
  delay = 0,
  enabled = false,
}: UseAnimatedCounterOptions): number {
  const [value, setValue] = useState(0)
  const rafId = useRef<number>(0)
  const firstFrame = useRef<number | null>(null)
  const animationStart = useRef<number | null>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!enabled || hasAnimated.current) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      setValue(target)
      hasAnimated.current = true
      return
    }

    const animate = (timestamp: number) => {
      if (firstFrame.current === null) {
        firstFrame.current = timestamp
      }

      // Wait for delay to elapse (counted in rAF frames, no setTimeout)
      if (timestamp - firstFrame.current < delay) {
        rafId.current = requestAnimationFrame(animate)
        return
      }

      if (animationStart.current === null) {
        animationStart.current = timestamp
      }

      const elapsed = timestamp - animationStart.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      setValue(Math.round(easedProgress * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      } else {
        hasAnimated.current = true
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId.current)
    }
  }, [enabled, target, duration, delay])

  return value
}
