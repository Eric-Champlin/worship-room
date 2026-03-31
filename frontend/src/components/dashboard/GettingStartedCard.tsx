import { useState, useEffect, useCallback, useId, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Circle, CircleCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { getCollapseState, setCollapseState } from '@/services/dashboard-collapse-storage'
import type { GettingStartedItem } from '@/hooks/useGettingStarted'

export interface GettingStartedCardProps {
  items: GettingStartedItem[]
  completedCount: number
  onDismiss: () => void
  onRequestCheckIn: () => void
}

const RING_RADIUS = 18
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function GettingStartedCard({
  items,
  completedCount,
  onDismiss,
  onRequestCheckIn,
}: GettingStartedCardProps) {
  const navigate = useNavigate()
  const prefersReduced = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()
  const uniqueId = useId()
  const titleId = `getting-started-title-${uniqueId}`
  const contentId = `getting-started-content-${uniqueId}`

  // Collapse state
  const [collapsed, setCollapsed] = useState(() => {
    const persisted = getCollapseState()
    return persisted['getting-started'] ?? false
  })

  // Fade-out animation
  const [fadingOut, setFadingOut] = useState(false)

  // Track previous completion states for item animation
  const prevCompletedRef = useRef<Record<string, boolean>>({})
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newlyCompleted = new Set<string>()
    for (const item of items) {
      if (item.completed && !prevCompletedRef.current[item.key]) {
        newlyCompleted.add(item.key)
      }
    }

    // Update ref to current state
    const map: Record<string, boolean> = {}
    for (const item of items) {
      map[item.key] = item.completed
    }
    prevCompletedRef.current = map

    if (newlyCompleted.size > 0) {
      setJustCompleted(newlyCompleted)
      playSoundEffect('sparkle')
      const timer = setTimeout(() => setJustCompleted(new Set()), 300)
      return () => clearTimeout(timer)
    }
  }, [items])

  // Progress ring animation
  const targetOffset = RING_CIRCUMFERENCE * (1 - completedCount / 6)

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      setCollapseState('getting-started', next)
      return next
    })
  }, [])

  const handleDismiss = useCallback(() => {
    if (prefersReduced) {
      onDismiss()
      return
    }
    setFadingOut(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }, [onDismiss, prefersReduced])

  const handleGoClick = useCallback(
    (item: GettingStartedItem) => {
      if (item.destination === null) {
        // Item 1: trigger mood check-in
        onRequestCheckIn()
      } else {
        navigate(item.destination)
      }
    },
    [navigate, onRequestCheckIn],
  )

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6 transition-opacity duration-300 motion-reduce:transition-none',
        fadingOut && 'opacity-0',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          id={titleId}
          className="text-base font-semibold text-white md:text-lg"
        >
          Getting Started
        </h2>

        <div className="flex items-center gap-2">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              role="img"
              aria-label={`${completedCount} of 6 getting started items completed`}
            >
              <circle
                cx="24"
                cy="24"
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r={RING_RADIUS}
                stroke="#6D28D9"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={targetOffset}
                style={
                  prefersReduced
                    ? undefined
                    : { transition: 'stroke-dashoffset 500ms ease-out' }
                }
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
              {completedCount}/6
            </span>
          </div>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapse}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className="rounded-lg p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            aria-label={collapsed ? 'Expand Getting Started' : 'Collapse Getting Started'}
          >
            <ChevronDown
              className={cn(
                'h-5 w-5 transition-transform duration-200 motion-reduce:transition-none',
                !collapsed && 'rotate-180',
              )}
            />
          </button>

          {/* Dismiss X */}
          <button
            onClick={handleDismiss}
            className="rounded-lg p-2 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
            aria-label="Dismiss getting started checklist"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pt-3">
            {/* Live region for screen reader announcements */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {justCompleted.size > 0 &&
                items
                  .filter((item) => justCompleted.has(item.key))
                  .map(
                    (item) =>
                      `${item.label} completed, ${completedCount} of 6`,
                  )
                  .join('. ')}
            </div>

            {items.map((item) => {
              const isJustCompleted = justCompleted.has(item.key)

              return (
                <div
                  key={item.key}
                  className={cn(
                    'flex min-h-[44px] items-center gap-3 transition-opacity duration-300 motion-reduce:transition-none',
                    item.completed && 'opacity-50',
                  )}
                  aria-label={
                    item.completed
                      ? `${item.label} — completed`
                      : `${item.label} — not completed, ${item.pointHint.replace('+', 'plus ')}`
                  }
                >
                  {/* Icon */}
                  {item.completed ? (
                    <CircleCheck
                      className={cn(
                        'h-6 w-6 flex-shrink-0 text-success transition-transform motion-reduce:transition-none',
                        isJustCompleted && !prefersReduced && 'scale-110',
                      )}
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="h-6 w-6 flex-shrink-0 text-white/20"
                      aria-hidden="true"
                    />
                  )}

                  {/* Label + point hint */}
                  <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span
                      className={cn(
                        'text-sm md:text-base',
                        item.completed
                          ? 'text-white/40 line-through'
                          : 'text-white/70',
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'text-xs',
                        item.completed ? 'text-white/20' : 'text-white/60',
                      )}
                    >
                      {item.pointHint}
                    </span>
                  </div>

                  {/* Go link */}
                  {!item.completed && (
                    <button
                      onClick={() => handleGoClick(item)}
                      className="ml-auto flex-shrink-0 rounded px-2 py-1 text-sm font-medium text-primary transition-colors hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
                      aria-label={`Go to ${item.label.toLowerCase()}`}
                    >
                      Go
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
