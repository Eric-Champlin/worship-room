import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Highlighter, Lock, Share2, StickyNote } from 'lucide-react'
import { HIGHLIGHT_COLORS } from '@/constants/bible'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface FloatingActionBarProps {
  verseNumber: number
  verseText: string
  bookName: string
  bookSlug: string
  chapter: number
  isAuthenticated: boolean
  hasHighlight: boolean
  hasNote: boolean
  currentHighlightColor?: string
  showColorPicker: boolean
  onHighlight: () => void
  onSelectColor: (color: string) => void
  onNote: () => void
  onCopy: () => void
  onShare: () => void
  onDismiss: () => void
  targetElement: HTMLElement | null
}

const VIEWPORT_MARGIN = 8
const MOBILE_BREAKPOINT = 640

export function FloatingActionBar({
  isAuthenticated,
  hasHighlight,
  hasNote,
  currentHighlightColor,
  showColorPicker,
  onHighlight,
  onSelectColor,
  onNote,
  onCopy,
  onShare,
  onDismiss,
  targetElement,
}: FloatingActionBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const prefersReduced = useReducedMotion()

  // Calculate position relative to target element
  useEffect(() => {
    if (!targetElement) return

    const calculate = () => {
      const bar = barRef.current
      if (!bar) return

      const targetRect = targetElement.getBoundingClientRect()
      const barRect = bar.getBoundingClientRect()
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT

      let top: number
      let left: number

      if (isMobile) {
        top = targetRect.bottom + 8
        left = Math.max(
          VIEWPORT_MARGIN,
          targetRect.left + targetRect.width / 2 - barRect.width / 2,
        )
      } else {
        top = targetRect.top - barRect.height - 8
        left = targetRect.left + targetRect.width / 2 - barRect.width / 2
      }

      // Viewport clamping
      if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN
      if (left + barRect.width > window.innerWidth - VIEWPORT_MARGIN) {
        left = window.innerWidth - VIEWPORT_MARGIN - barRect.width
      }
      if (top < VIEWPORT_MARGIN) top = targetRect.bottom + 8
      if (top + barRect.height > window.innerHeight - VIEWPORT_MARGIN) {
        top = targetRect.top - barRect.height - 8
      }

      setPosition({ top, left })
    }

    requestAnimationFrame(() => {
      calculate()
      requestAnimationFrame(() => setIsVisible(true))
    })
  }, [targetElement, showColorPicker])

  // Dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // Dismiss on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        barRef.current &&
        !barRef.current.contains(target) &&
        targetElement &&
        !targetElement.contains(target)
      ) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onDismiss, targetElement])

  // Dismiss on scroll
  useEffect(() => {
    const handleScroll = () => onDismiss()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [onDismiss])

  // Focus first button on open
  useEffect(() => {
    if (isVisible && barRef.current) {
      const firstButton = barRef.current.querySelector<HTMLButtonElement>('button')
      firstButton?.focus()
    }
  }, [isVisible])

  if (!targetElement) return null

  const btnClass =
    'flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'

  const bar = (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Verse actions"
      className="z-[60]"
      style={{
        position: 'fixed',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        opacity: prefersReduced ? 1 : isVisible ? 1 : 0,
        transition: prefersReduced ? 'none' : 'opacity 150ms ease-out',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-white/15 px-2 py-1 backdrop-blur-md">
        {isAuthenticated ? (
          <>
            <button
              type="button"
              onClick={onHighlight}
              className={btnClass}
              aria-label={hasHighlight ? 'Change highlight' : 'Highlight verse'}
              aria-expanded={showColorPicker}
            >
              <Highlighter size={20} aria-hidden="true" />
            </button>
            {showColorPicker && (
              <div className="flex items-center gap-2 px-1" role="group" aria-label="Highlight colors">
                {HIGHLIGHT_COLORS.map((c) => {
                  const isActive = currentHighlightColor === c.hex
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => onSelectColor(c.hex)}
                      className="relative flex h-[44px] w-[44px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:rounded-full"
                      aria-label={`Highlight ${c.name.toLowerCase()}`}
                      aria-pressed={isActive}
                    >
                      <span
                        className={`block h-6 w-6 rounded-full border-2 ${isActive ? 'border-white' : 'border-white/40'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                      {isActive && (
                        <Check
                          size={12}
                          className="absolute text-white"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={onNote}
              className={btnClass}
              aria-label={hasNote ? 'Edit note' : 'Add note'}
            >
              <StickyNote size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onCopy}
              className={btnClass}
              aria-label="Copy verse"
            >
              <Copy size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onShare}
              className={btnClass}
              aria-label="Share verse"
            >
              <Share2 size={20} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-2">
              <Lock size={16} className="text-white/60" aria-hidden="true" />
              <span className="text-xs text-white/60">
                Sign in to highlight and take notes
              </span>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className={btnClass}
              aria-label="Copy verse"
            >
              <Copy size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(bar, document.body)
}
