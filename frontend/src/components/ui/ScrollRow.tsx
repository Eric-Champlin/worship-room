import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ScrollRowProps {
  children: ReactNode
  ariaLabel: string
  itemCount: number
  /** Items > threshold surface a "See more" affordance when overflow is present. */
  overflowThreshold?: number
  className?: string
}

const EDGE_FADE_EPSILON = 4
const SCROLL_BY_PX = 300

export function ScrollRow({
  children,
  ariaLabel,
  itemCount,
  overflowThreshold = 6,
  className,
}: ScrollRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const recomputeFades = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const canScrollLeft = el.scrollLeft > EDGE_FADE_EPSILON
    const canScrollRight =
      el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_FADE_EPSILON
    setShowLeftFade(canScrollLeft)
    setShowRightFade(canScrollRight)
  }, [])

  useEffect(() => {
    recomputeFades()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', recomputeFades, { passive: true })
    window.addEventListener('resize', recomputeFades)
    return () => {
      el.removeEventListener('scroll', recomputeFades)
      window.removeEventListener('resize', recomputeFades)
    }
  }, [recomputeFades, itemCount])

  const handleSeeMore = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({
      left: SCROLL_BY_PX,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [])

  const showAffordance = itemCount > overflowThreshold && showRightFade

  return (
    <div role="region" aria-label={ariaLabel} className={cn('relative', className)}>
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {children}
      </div>

      {showLeftFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-0 top-0 w-8 bg-gradient-to-r from-hero-bg to-transparent"
        />
      )}

      {showRightFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-hero-bg to-transparent"
        />
      )}

      {showAffordance && (
        <button
          type="button"
          onClick={handleSeeMore}
          aria-label="See more"
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.12] text-white/80 transition-colors duration-base motion-reduce:transition-none hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
