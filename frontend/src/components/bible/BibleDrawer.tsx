import { useEffect, useState, useRef, useCallback } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const SWIPE_THRESHOLD = 50

interface BibleDrawerProps {
  isOpen: boolean
  onClose: () => void
  ariaLabel: string
  children: React.ReactNode
}

export function BibleDrawer({ isOpen, onClose, ariaLabel, children }: BibleDrawerProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isEntering, setIsEntering] = useState(false)
  const reducedMotion = useReducedMotion()
  const touchStartX = useRef(0)

  const containerRef = useFocusTrap(isOpen, onClose)

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Entry animation tracking
  useEffect(() => {
    if (isOpen && !reducedMotion) {
      setIsEntering(true)
      const timer = setTimeout(() => setIsEntering(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, reducedMotion])

  // Swipe-right to close (all breakpoints — drawer slides from right)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === 0) return
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta > 0) {
      setSwipeOffset(delta)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > SWIPE_THRESHOLD) {
      onClose()
    }
    setSwipeOffset(0)
    touchStartX.current = 0
  }, [swipeOffset, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop — visible on ALL breakpoints */}
      <div
        className="fixed inset-0 z-[10000] bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[10001] flex h-full flex-col overflow-hidden border-l border-white/10',
          'w-full sm:w-[420px] lg:w-[480px]',
          !reducedMotion && isEntering && 'animate-drawer-slide-in',
        )}
        style={{
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : 'transform 300ms ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </>
  )
}
