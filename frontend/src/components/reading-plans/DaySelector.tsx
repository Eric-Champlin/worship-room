import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import type { PlanProgress } from '@/types/reading-plans'

interface DaySelectorProps {
  totalDays: number
  selectedDay: number
  progress?: PlanProgress
  dayTitles: string[]
  onSelectDay: (day: number) => void
}

export function DaySelector({
  totalDays,
  selectedDay,
  progress,
  dayTitles,
  onSelectDay,
}: DaySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { showToast } = useToast()

  const days = Array.from({ length: totalDays }, (_, i) => i + 1)

  const isDayCompleted = (day: number) =>
    progress?.completedDays.includes(day) ?? false

  const isDayLocked = (day: number) => {
    if (!progress) return day > 1
    if (isDayCompleted(day)) return false
    return day > progress.currentDay
  }

  const handleSelect = useCallback(
    (day: number) => {
      if (isDayLocked(day)) {
        showToast('Complete the current day to unlock this one.', 'warning')
        return
      }
      onSelectDay(day)
      setIsOpen(false)
      triggerRef.current?.focus()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSelectDay, showToast, progress],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setIsOpen(true)
          setFocusedIndex(selectedDay - 1)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, totalDays - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0) handleSelect(focusedIndex + 1)
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          triggerRef.current?.focus()
          break
      }
    },
    [isOpen, focusedIndex, totalDays, selectedDay, handleSelect],
  )

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Scroll focused item into view
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return
    const panel = panelRef.current
    if (!panel) return
    const items = panel.querySelectorAll('[role="option"]')
    items[focusedIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [isOpen, focusedIndex])

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) setFocusedIndex(selectedDay - 1)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
      >
        Day {selectedDay} of {totalDays}
        <ChevronDown
          size={16}
          className={cn('transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label="Select a day"
          className="absolute z-30 mt-2 w-full min-w-[16rem] max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-hero-mid py-2 shadow-lg sm:w-64"
        >
          {days.map((day, index) => {
            const completed = isDayCompleted(day)
            const locked = isDayLocked(day)
            const isCurrent = day === selectedDay
            const isFocused = index === focusedIndex

            return (
              <div
                key={day}
                role="option"
                aria-selected={isCurrent}
                aria-disabled={locked}
                tabIndex={-1}
                onClick={() => handleSelect(day)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-3 text-sm text-white',
                  isCurrent && 'bg-white/10',
                  isFocused && !isCurrent && 'bg-white/5',
                  locked && 'cursor-not-allowed text-white/30',
                  !locked && !isCurrent && 'hover:bg-white/10',
                )}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {completed ? (
                    <Check size={16} className="text-success" />
                  ) : locked ? (
                    <Lock size={14} className="text-white/30" />
                  ) : null}
                </span>
                <span className="truncate">
                  Day {day}{dayTitles[index] ? `: ${dayTitles[index]}` : ''}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
