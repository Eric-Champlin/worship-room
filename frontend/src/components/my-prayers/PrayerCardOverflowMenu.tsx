import { useState, useCallback, useEffect, useRef } from 'react'
import { MoreVertical, Heart, Pencil, CheckCircle, Trash2 } from 'lucide-react'
import type { PersonalPrayer } from '@/types/personal-prayer'

interface PrayerCardOverflowMenuProps {
  prayer: PersonalPrayer
  onPray: () => void
  onEdit: () => void
  onMarkAnswered: () => void
  onDelete: () => void
}

export function PrayerCardOverflowMenu({
  prayer,
  onPray,
  onEdit,
  onMarkAnswered,
  onDelete,
}: PrayerCardOverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClickOutside])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative pt-3 sm:hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Prayer actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-48 motion-safe:animate-dropdown-in rounded-xl border border-white/15 bg-hero-mid shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onPray)}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            Pray for this
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onEdit)}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>

          {prayer.status === 'active' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => handleAction(onMarkAnswered)}
              className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10"
            >
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Mark Answered
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => handleAction(onDelete)}
            className="flex min-h-[44px] w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-white/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
