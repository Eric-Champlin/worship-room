import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useAnnounce } from '@/hooks/useAnnounce'
import { markTooltipSeen } from '@/services/tooltip-storage'
import { Z } from '@/constants/z-index'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipCalloutProps {
  targetRef: React.RefObject<HTMLElement | null>
  message: string
  tooltipId: string
  position?: TooltipPosition
  onDismiss?: () => void
}

const OFFSET = 12
const ARROW_SIZE = 8
const VIEWPORT_MARGIN = 8
const FADE_IN_MS = 300
const FADE_OUT_MS = 200
const AUTO_DISMISS_MS = 8000
const MOBILE_BREAKPOINT = 640

interface PositionResult {
  top: number
  left: number
  arrowTop: number
  arrowLeft: number
  effectivePosition: TooltipPosition
}

function calculatePosition(
  target: DOMRect,
  tooltip: DOMRect,
  position: TooltipPosition,
  isMobile: boolean,
): PositionResult {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Mobile override: always bottom (or top if near viewport bottom)
  let effectivePosition = position
  if (isMobile) {
    const spaceBelow = vh - target.bottom - OFFSET
    effectivePosition = spaceBelow < tooltip.height + VIEWPORT_MARGIN ? 'top' : 'bottom'
  }

  let top = 0
  let left = 0

  switch (effectivePosition) {
    case 'top':
      top = target.top - tooltip.height - OFFSET
      left = target.left + target.width / 2 - tooltip.width / 2
      break
    case 'bottom':
      top = target.bottom + OFFSET
      left = target.left + target.width / 2 - tooltip.width / 2
      break
    case 'left':
      top = target.top + target.height / 2 - tooltip.height / 2
      left = target.left - tooltip.width - OFFSET
      break
    case 'right':
      top = target.top + target.height / 2 - tooltip.height / 2
      left = target.right + OFFSET
      break
  }

  // Mobile: full width with margins
  if (isMobile) {
    left = 16
  } else {
    // Viewport clamping (horizontal)
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN
    if (left + tooltip.width > vw - VIEWPORT_MARGIN) left = vw - VIEWPORT_MARGIN - tooltip.width
  }

  // Viewport clamping (vertical)
  if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN
  if (top + tooltip.height > vh - VIEWPORT_MARGIN) top = vh - VIEWPORT_MARGIN - tooltip.height

  // Arrow position — points at center of target's relevant edge
  let arrowTop = 0
  let arrowLeft = 0

  switch (effectivePosition) {
    case 'top':
      arrowTop = tooltip.height
      arrowLeft = Math.max(
        ARROW_SIZE,
        Math.min(target.left + target.width / 2 - left, tooltip.width - ARROW_SIZE),
      )
      break
    case 'bottom':
      arrowTop = -ARROW_SIZE * 2
      arrowLeft = Math.max(
        ARROW_SIZE,
        Math.min(target.left + target.width / 2 - left, tooltip.width - ARROW_SIZE),
      )
      break
    case 'left':
      arrowLeft = tooltip.width
      arrowTop = Math.max(
        ARROW_SIZE,
        Math.min(target.top + target.height / 2 - top, tooltip.height - ARROW_SIZE),
      )
      break
    case 'right':
      arrowLeft = -ARROW_SIZE * 2
      arrowTop = Math.max(
        ARROW_SIZE,
        Math.min(target.top + target.height / 2 - top, tooltip.height - ARROW_SIZE),
      )
      break
  }

  return { top, left, arrowTop, arrowLeft, effectivePosition }
}

function getArrowStyle(
  effectivePosition: TooltipPosition,
  arrowTop: number,
  arrowLeft: number,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: ARROW_SIZE,
  }

  switch (effectivePosition) {
    case 'top':
      return {
        ...base,
        top: arrowTop,
        left: arrowLeft - ARROW_SIZE,
        borderColor: 'rgba(255,255,255,0.1) transparent transparent transparent',
      }
    case 'bottom':
      return {
        ...base,
        top: arrowTop,
        left: arrowLeft - ARROW_SIZE,
        borderColor: 'transparent transparent rgba(255,255,255,0.1) transparent',
      }
    case 'left':
      return {
        ...base,
        top: arrowTop - ARROW_SIZE,
        left: arrowLeft,
        borderColor: 'transparent transparent transparent rgba(255,255,255,0.1)',
      }
    case 'right':
      return {
        ...base,
        top: arrowTop - ARROW_SIZE,
        left: arrowLeft,
        borderColor: 'transparent rgba(255,255,255,0.1) transparent transparent',
      }
  }
}

function getTranslateOrigin(position: TooltipPosition): { x: string; y: string } {
  switch (position) {
    case 'top':
      return { x: '0', y: '4px' }
    case 'bottom':
      return { x: '0', y: '-4px' }
    case 'left':
      return { x: '4px', y: '0' }
    case 'right':
      return { x: '-4px', y: '0' }
  }
}

export function TooltipCallout({
  targetRef,
  message,
  tooltipId,
  position = 'bottom',
  onDismiss,
}: TooltipCalloutProps) {
  const prefersReduced = useReducedMotion()
  const { announce, AnnouncerRegion } = useAnnounce()
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dismissedRef = useRef(false)

  const [pos, setPos] = useState<PositionResult | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isTargetVisible, setIsTargetVisible] = useState(true)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT

  // Recalculate position
  const recalculate = useCallback(() => {
    const target = targetRef.current
    const tooltip = tooltipRef.current
    if (!target || !tooltip) return

    const targetRect = target.getBoundingClientRect()
    if (targetRect.width === 0 || targetRect.height === 0) return

    const tooltipRect = tooltip.getBoundingClientRect()
    const mobile = window.innerWidth < MOBILE_BREAKPOINT
    setPos(calculatePosition(targetRect, tooltipRect, position, mobile))
  }, [targetRef, position])

  // Initial positioning + scroll/resize listeners
  useEffect(() => {
    if (!targetRef.current) return

    const targetRect = targetRef.current.getBoundingClientRect()
    if (targetRect.width === 0 || targetRect.height === 0) return

    // Initial position after render
    requestAnimationFrame(() => {
      recalculate()
      // Trigger fade-in after position is set
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    })

    let rafId: number | null = null
    const throttledRecalc = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        recalculate()
        rafId = null
      })
    }

    window.addEventListener('scroll', throttledRecalc, { passive: true })
    window.addEventListener('resize', throttledRecalc)

    return () => {
      window.removeEventListener('scroll', throttledRecalc)
      window.removeEventListener('resize', throttledRecalc)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [targetRef, recalculate])

  // Track target visibility via IntersectionObserver
  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTargetVisible(entry.isIntersecting)
      },
      { threshold: 0.5 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [targetRef])

  // Dismiss handler
  const dismiss = useCallback(
    (returnFocusToTarget = false) => {
      if (dismissedRef.current) return
      dismissedRef.current = true

      markTooltipSeen(tooltipId)
      announce('Tooltip dismissed', 'polite')

      if (prefersReduced) {
        if (returnFocusToTarget) targetRef.current?.focus()
        onDismiss?.()
        return
      }

      setIsDismissing(true)
      setTimeout(() => {
        if (returnFocusToTarget) targetRef.current?.focus()
        onDismiss?.()
      }, FADE_OUT_MS)
    },
    [tooltipId, onDismiss, prefersReduced, targetRef, announce],
  )

  // Auto-dismiss after 8s
  useEffect(() => {
    if (!isVisible || isDismissing) return
    const timer = setTimeout(() => dismiss(false), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [isVisible, isDismissing, dismiss])

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(true)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dismiss])

  // Auto-focus button and announce after fade-in
  useEffect(() => {
    if (isVisible && !isDismissing) {
      const delay = prefersReduced ? 0 : FADE_IN_MS
      const timer = setTimeout(() => {
        buttonRef.current?.focus()
        announce(message, 'polite')
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [isVisible, isDismissing, prefersReduced, announce, message])

  // Don't render if target is invalid
  if (!targetRef.current) return null

  const targetRect = targetRef.current.getBoundingClientRect()
  if (targetRect.width === 0 || targetRect.height === 0) return null

  // Don't render if target scrolled out of view
  if (!isTargetVisible) return null

  // If dismissing and reduced motion, don't render
  if (isDismissing && prefersReduced) return null

  const effectivePosition = pos?.effectivePosition ?? position
  const translate = getTranslateOrigin(effectivePosition)

  const opacity = isDismissing ? 0 : isVisible ? 1 : 0
  const transform = isDismissing || !isVisible
    ? `translate(${translate.x}, ${translate.y})`
    : 'translate(0, 0)'

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos?.top ?? 0,
    left: pos?.left ?? 0,
    ...(isMobile ? { right: 16 } : {}),
    opacity: prefersReduced ? 1 : opacity,
    transform: prefersReduced ? 'none' : transform,
    transition: prefersReduced
      ? 'none'
      : isDismissing
        ? `opacity ${FADE_OUT_MS}ms ease-in, transform ${FADE_OUT_MS}ms ease-in`
        : `opacity ${FADE_IN_MS}ms ease-out, transform ${FADE_IN_MS}ms ease-out`,
    pointerEvents: isDismissing ? 'none' : 'auto',
  }

  return createPortal(
    <>
      <div
        ref={tooltipRef}
        role="tooltip"
        id={tooltipId}
        className={`z-[${Z.TOOLTIP}] ${isMobile ? '' : 'max-w-[300px] sm:max-w-[320px] lg:max-w-[300px]'}`}
        style={containerStyle}
      >
        {/* Arrow */}
        {pos && (
          <div
            style={getArrowStyle(effectivePosition, pos.arrowTop, pos.arrowLeft)}
            aria-hidden="true"
          />
        )}

        {/* Tooltip body */}
        <div className="rounded-xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-md">
          <p className="text-sm text-white">{message}</p>
          <button
            ref={buttonRef}
            type="button"
            onClick={() => dismiss(false)}
            className="mt-2 min-h-[44px] rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-transparent sm:min-h-0"
          >
            Got it
          </button>
        </div>
      </div>
      <AnnouncerRegion />
    </>,
    document.body,
  )
}
