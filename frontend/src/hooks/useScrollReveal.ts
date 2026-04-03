import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useScrollReveal(options: UseScrollRevealOptions = {}): {
  ref: React.RefObject<HTMLElement | null>
  isVisible: boolean
} {
  const { threshold = 0.1, rootMargin = '-50px', triggerOnce = true } = options

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion) return

    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, prefersReducedMotion])

  return { ref, isVisible }
}

export function staggerDelay(
  index: number,
  baseDelay = 100,
  initialDelay = 0
): CSSProperties {
  return { transitionDelay: `${initialDelay + index * baseDelay}ms` }
}
