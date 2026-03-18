import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface AnimatedCounterProps {
  from: number
  to: number
  duration?: number
  className?: string
  formatFn?: (n: number) => string
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

export function AnimatedCounter({
  from,
  to,
  duration = 600,
  className,
  formatFn = (n) => n.toLocaleString(),
}: AnimatedCounterProps) {
  const prefersReduced = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(prefersReduced ? to : from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(to)
      return
    }

    const startTime = performance.now()
    const startValue = from
    const delta = to - startValue

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOut(progress)
      const current = Math.round(startValue + delta * easedProgress)
      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [from, to, duration, prefersReduced])

  return <span className={className}>{formatFn(displayValue)}</span>
}
