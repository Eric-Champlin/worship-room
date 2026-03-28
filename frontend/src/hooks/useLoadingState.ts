import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const THRESHOLD_MS = 300

interface UseLoadingStateReturn {
  shouldShowSkeleton: boolean
  contentRef: React.RefObject<HTMLDivElement>
}

export function useLoadingState(isLoading: boolean): UseLoadingStateReturn {
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setShouldShowSkeleton(true)
      }, THRESHOLD_MS)
    } else {
      // Loading finished
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setShouldShowSkeleton(false)

      // Add fade-in to content when transitioning from skeleton
      if (!reducedMotion && contentRef.current) {
        const el = contentRef.current
        el.classList.remove('animate-content-fade-in')
        void el.offsetWidth // Force reflow to restart animation
        el.classList.add('animate-content-fade-in')
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isLoading, reducedMotion])

  return { shouldShowSkeleton, contentRef }
}
