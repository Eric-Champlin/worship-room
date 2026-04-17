import { useRef, useCallback, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  /** Optional badge node (e.g. active-challenge pulse dot) rendered after the label */
  badge?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
  /** Additional classes merged onto the outer pill container */
  className?: string
}

/**
 * Shared pill-style tabs matching Daily Hub pattern.
 * Arrow keys, Home, and End rotate focus and active tab.
 */
export function Tabs({ items, activeId, onChange, ariaLabel, className }: TabsProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      let nextIndex: number | null = null
      if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % items.length
      else if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + items.length) % items.length
      else if (e.key === 'Home') nextIndex = 0
      else if (e.key === 'End') nextIndex = items.length - 1
      if (nextIndex !== null) {
        e.preventDefault()
        onChange(items[nextIndex].id)
        buttonRefs.current[nextIndex]?.focus()
      }
    },
    [items, onChange],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1',
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            ref={(el) => {
              buttonRefs.current[index] = el
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-full min-h-[44px]',
              'text-sm font-medium transition-all motion-reduce:transition-none duration-base',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
              'sm:text-base active:scale-[0.98]',
              isActive
                ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge}
          </button>
        )
      })}
    </div>
  )
}
