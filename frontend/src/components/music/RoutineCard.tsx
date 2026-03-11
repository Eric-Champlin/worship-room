import { useState, useRef, useEffect } from 'react'
import { Mountain, BookOpen, Moon, MoreVertical, Play } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import type { RoutineDefinition } from '@/types/storage'

const STEP_ICON_MAP = {
  scene: Mountain,
  scripture: BookOpen,
  story: Moon,
} as const

interface RoutineCardProps {
  routine: RoutineDefinition
  onStart: () => void
  onClone?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

function estimateDuration(routine: RoutineDefinition): number {
  const gapMinutes = routine.steps.reduce((sum, s) => sum + s.transitionGapMinutes, 0)
  // Rough estimate: 5 min per step + gap time
  return routine.steps.length * 5 + gapMinutes
}

export function RoutineCard({
  routine,
  onStart,
  onClone,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
  const { isLoggedIn } = useAuth()
  const authModal = useAuthModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  // Close menu on outside click or Escape key
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuTriggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleStart = () => {
    if (!isLoggedIn) {
      authModal?.openAuthModal('Sign in to use bedtime routines')
      return
    }
    onStart()
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    if (!items?.length) return
    const current = Array.from(items).indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (current + 1) % items.length
      items[next].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (current - 1 + items.length) % items.length
      items[prev].focus()
    }
  }

  const handleClone = () => {
    setMenuOpen(false)
    if (!isLoggedIn) {
      authModal?.openAuthModal('Sign in to create bedtime routines')
      return
    }
    onClone?.()
  }

  const durationEstimate = estimateDuration(routine)

  return (
    <div
      role="article"
      aria-label={`${routine.name} routine — ${routine.steps.length} steps, approximately ${durationEstimate} minutes`}
      className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Template badge */}
      {routine.isTemplate && (
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Template
        </span>
      )}

      {/* Name */}
      <h3 className="text-base font-semibold text-text-dark">{routine.name}</h3>

      {/* Description (templates only) */}
      {routine.description && (
        <p className="mt-1 text-sm text-text-light">{routine.description}</p>
      )}

      {/* Step icons */}
      <div className="mt-3 flex items-center gap-1.5">
        {routine.steps.map((step) => {
          const Icon = STEP_ICON_MAP[step.type]
          return (
            <span
              key={step.id}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100"
              aria-label={step.type}
            >
              <Icon size={12} className="text-text-light" aria-hidden="true" />
            </span>
          )
        })}
      </div>

      {/* Meta */}
      <p className="mt-2 text-xs text-text-light">
        {routine.steps.length} steps &middot; ~{durationEstimate} min
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStart}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <Play size={14} fill="currentColor" /> Start
        </button>

        {/* Three-dot menu */}
        <div ref={menuRef} className="relative ml-auto">
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Routine options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-light transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Routine options"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {routine.isTemplate ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleClone}
                  className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                >
                  Clone &amp; Customize
                </button>
              ) : (
                <>
                  {onEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onEdit()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                    >
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onDuplicate()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-text-dark hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                    >
                      Duplicate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onDelete()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
