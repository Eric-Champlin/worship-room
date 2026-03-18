import { useEffect, useRef } from 'react'
import { ENCOURAGEMENT_PRESETS } from '@/constants/dashboard/encouragements'

interface EncouragePopoverProps {
  friendName: string
  onClose: () => void
  onSend: (message: string) => void
  isMobile: boolean
}

export function EncouragePopover({ friendName, onClose, onSend, isMobile }: EncouragePopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  // Focus first item on open
  useEffect(() => {
    firstItemRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }

    // Arrow key navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      if (!items || items.length === 0) return
      const currentIndex = Array.from(items).findIndex((el) => el === document.activeElement)
      let nextIndex: number
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      }
      items[nextIndex].focus()
    }
  }

  function handleSelect(message: string) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSend(message)
    }
  }

  function handleItemKeyDown(message: string) {
    return (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onSend(message)
      }
    }
  }

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-hidden="true"
        />
        {/* Bottom sheet */}
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Encourage ${friendName}`}
          onKeyDown={handleKeyDown}
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl border border-white/15 bg-hero-mid shadow-lg motion-safe:animate-dropdown-in"
        >
          <div className="px-4 pb-2 pt-3">
            <p className="text-xs font-medium text-white/50">Send encouragement</p>
          </div>
          {ENCOURAGEMENT_PRESETS.map((preset, i) => (
            <button
              key={preset}
              ref={i === 0 ? firstItemRef : undefined}
              role="menuitem"
              onClick={handleSelect(preset)}
              onKeyDown={handleItemKeyDown(preset)}
              className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-none"
            >
              {preset}
            </button>
          ))}
          <div className="h-safe-bottom" />
        </div>
      </>
    )
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Encourage ${friendName}`}
      onKeyDown={handleKeyDown}
      className="absolute right-0 top-full z-10 mt-1 w-[220px] rounded-xl border border-white/15 bg-hero-mid shadow-lg sm:w-[200px] motion-safe:animate-dropdown-in"
    >
      <div className="px-4 pb-1 pt-2">
        <p className="text-xs font-medium text-white/50">Send encouragement</p>
      </div>
      {ENCOURAGEMENT_PRESETS.map((preset, i) => (
        <button
          key={preset}
          ref={i === 0 ? firstItemRef : undefined}
          role="menuitem"
          onClick={handleSelect(preset)}
          onKeyDown={handleItemKeyDown(preset)}
          className="min-h-[44px] w-full px-4 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-none"
        >
          {preset}
        </button>
      ))}
    </div>
  )
}
