import { useRef, useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useAudioState, useAudioDispatch } from './AudioProvider'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'
import { DrawerNowPlaying } from './DrawerNowPlaying'
import { DrawerTabs } from './DrawerTabs'
import { RoutineStepper } from './RoutineStepper'
import { Z } from '@/constants/z-index'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'

const SWIPE_THRESHOLD = 50

export function AudioDrawer() {
  const state = useAudioState()
  const dispatch = useAudioDispatch()
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isEntering, setIsEntering] = useState(false)
  const reducedMotion = useReducedMotion()
  const touchStartY = useRef(0)
  const headerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    dispatch({ type: 'CLOSE_DRAWER' })
  }, [dispatch])

  const containerRef = useFocusTrap(state.drawerOpen, handleClose)

  // Click outside handler for desktop
  useEffect(() => {
    if (!state.drawerOpen) return

    function handleClickOutside(e: MouseEvent) {
      // Only on desktop (>1024px)
      if (window.innerWidth <= 1024) return
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }

    // Delay to avoid catching the pill click that opened the drawer
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [state.drawerOpen, handleClose, containerRef])

  // Swipe-down gesture (mobile only, header area)
  function handleTouchStart(e: React.TouchEvent) {
    // Only allow swipe from the header/handle area
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
      touchStartY.current = e.touches[0].clientY
    } else {
      touchStartY.current = 0
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === 0) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setSwipeOffset(delta)
    }
  }

  function handleTouchEnd() {
    if (swipeOffset > SWIPE_THRESHOLD) {
      handleClose()
    }
    setSwipeOffset(0)
    touchStartY.current = 0
  }

  // Track entering state for spring animation
  useEffect(() => {
    if (state.drawerOpen && !reducedMotion) {
      setIsEntering(true)
      const timer = setTimeout(() => setIsEntering(false), 300)
      return () => clearTimeout(timer)
    }
  }, [state.drawerOpen, reducedMotion])

  if (!state.drawerOpen) return null

  return (
    <>
      {/* Scrim (mobile only) */}
      <div
        className={`fixed inset-0 z-[${Z.DRAWER_BACKDROP}] bg-black/40 lg:hidden`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer / Panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Audio controls"
        className={cn(
          `fixed z-[${Z.DRAWER}] flex flex-col overflow-hidden rounded-t-2xl border border-white/10 lg:rounded-none lg:border-l lg:border-t-0 lg:border-b-0 lg:border-r-0 bottom-0 left-0 right-0 h-[70vh] lg:top-0 lg:right-0 lg:left-auto lg:bottom-0 lg:h-full lg:w-[400px]`,
          !reducedMotion && isEntering && 'motion-safe:animate-bottom-sheet-slide-in lg:motion-safe:animate-drawer-slide-in',
        )}
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transform:
            swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : `transform ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header with handle and close button */}
        <div
          ref={headerRef}
          className="flex items-center justify-between px-4 py-3"
        >
          {/* Swipe handle (mobile) */}
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20 lg:hidden" />
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close audio controls"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Now Playing section (~40%) */}
        <div className="shrink-0 overflow-hidden">
          <DrawerNowPlaying />
        </div>

        {/* Routine stepper (conditional) */}
        <RoutineStepper />

        {/* Tabbed section (~60%) */}
        <DrawerTabs />
      </div>
    </>
  )
}
