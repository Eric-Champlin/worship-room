import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isOnboardingComplete } from '@/services/onboarding-storage'
import { isTooltipSeen, markTooltipSeen } from '@/services/tooltip-storage'

const APPEARANCE_DELAY_MS = 1000

export function useTooltipCallout(
  tooltipId: string,
  targetRef: React.RefObject<HTMLElement | null>,
): { shouldShow: boolean; dismiss: () => void } {
  const { isAuthenticated } = useAuth()
  const [shouldShow, setShouldShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const dismiss = useCallback(() => {
    markTooltipSeen(tooltipId)
    setShouldShow(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [tooltipId])

  useEffect(() => {
    // Gate: must be authenticated, onboarding complete, and tooltip not already seen
    if (!isAuthenticated || !isOnboardingComplete() || isTooltipSeen(tooltipId)) {
      return
    }

    const target = targetRef.current
    if (!target) return

    // Check target has dimensions
    const rect = target.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // Observe target visibility
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Target is visible — start 1s delay
          if (!timerRef.current) {
            timerRef.current = setTimeout(() => {
              setShouldShow(true)
            }, APPEARANCE_DELAY_MS)
          }
        } else {
          // Target scrolled out — cancel delay
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
          setShouldShow(false)
        }
      },
      { threshold: 0.5 },
    )

    observerRef.current.observe(target)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [isAuthenticated, tooltipId, targetRef])

  return { shouldShow, dismiss }
}
