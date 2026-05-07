import { useState, useRef, useEffect } from 'react'
import { Mountain, BookOpen, Moon, MoreVertical, Play, Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { storageService } from '@/services/storage-service'
import { SCENE_BY_ID } from '@/data/scenes'
import type { RoutineDefinition } from '@/types/storage'

const STEP_ICON_MAP = {
  scene: Mountain,
  scripture: BookOpen,
  story: Moon,
  'bible-navigate': BookOpen,
} as const

const STEP_ICON_TINT_MAP: Record<string, { container: string; icon: string }> = {
  scene: { container: 'bg-glow-cyan/15', icon: 'text-glow-cyan' },
  scripture: { container: 'bg-amber-400/15', icon: 'text-amber-400' },
  story: { container: 'bg-primary-lt/15', icon: 'text-primary-lt' },
  'bible-navigate': { container: 'bg-amber-400/15', icon: 'text-amber-400' },
} as const

const DEFAULT_STEP_TINT = { container: 'bg-white/10', icon: 'text-white/60' }

function getRoutineSceneStripGradient(routine: RoutineDefinition): string | null {
  const firstSceneStep = routine.steps.find((s) => s.type === 'scene')
  if (!firstSceneStep) return null
  const scene = SCENE_BY_ID.get(firstSceneStep.contentId)
  if (!scene?.themeColor) return null
  return `linear-gradient(to right, ${scene.themeColor}aa, ${scene.themeColor}33)`
}

interface RoutineCardProps {
  routine: RoutineDefinition
  isActive?: boolean
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
  isActive = false,
  onStart,
  onClone,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  const [isFavorited, setIsFavorited] = useState<boolean>(() =>
    storageService.isRoutineFavorited(routine.id),
  )

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
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to use bedtime routines')
      return
    }
    onStart()
  }

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to favorite routines')
      return
    }
    storageService.toggleRoutineFavorite(routine.id)
    setIsFavorited((prev) => !prev)
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
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to create bedtime routines')
      return
    }
    onClone?.()
  }

  const durationEstimate = estimateDuration(routine)
  const topStripGradient = getRoutineSceneStripGradient(routine)

  return (
    <div
      role="article"
      aria-label={`${routine.name} routine — ${routine.steps.length} steps, approximately ${durationEstimate} minutes`}
      className={`relative rounded-2xl border ${isActive ? 'border-primary/40' : 'border-white/[0.12]'} bg-white/[0.06] p-5 backdrop-blur-sm shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)] transition-[background-color,border-color] motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18]`}
    >
      {/* Scene-color top strip */}
      {topStripGradient && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundImage: topStripGradient }}
        />
      )}

      {/* Badge slot — active takes precedence over template badge */}
      {isActive ? (
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
          Now playing
        </span>
      ) : routine.isTemplate ? (
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-violet-300">
          Template
        </span>
      ) : null}

      {/* Name */}
      <h3 className="text-base font-semibold text-white">{routine.name}</h3>

      {/* Description (templates only) */}
      {routine.description && (
        <p className="mt-1 text-sm text-white/60">{routine.description}</p>
      )}

      {/* Step icons */}
      <div className="mt-3 flex items-center gap-1.5">
        {routine.steps.map((step) => {
          const Icon = STEP_ICON_MAP[step.type]
          const tint = STEP_ICON_TINT_MAP[step.type] ?? DEFAULT_STEP_TINT
          return (
            <span
              key={step.id}
              role="img"
              className={`flex h-6 w-6 items-center justify-center rounded-full ${tint.container}`}
              aria-label={step.type}
            >
              <Icon size={12} className={tint.icon} aria-hidden="true" />
            </span>
          )
        })}
      </div>

      {/* Meta */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
        {routine.sleepTimer && routine.sleepTimer.durationMinutes > 0 && (
          <Moon size={12} className="text-violet-300" aria-hidden="true" />
        )}
        <span>
          {routine.steps.length} steps &middot; ~{durationEstimate} min
        </span>
      </p>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={handleStart}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-hero-bg shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-200 hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark"
        >
          <Play size={14} fill="currentColor" aria-hidden="true" /> Start
        </button>

        {/* Favorite button */}
        <button
          type="button"
          onClick={handleFavoriteToggle}
          aria-label={isFavorited ? `Unfavorite ${routine.name}` : `Favorite ${routine.name}`}
          aria-pressed={isFavorited}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-dark ${
            isFavorited
              ? 'bg-pink-500/15 text-pink-300 hover:bg-pink-500/20'
              : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80'
          }`}
        >
          <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Routine options"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-white/[0.12] py-1 shadow-lg"
              style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
              {routine.isTemplate ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleClone}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
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
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
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
                      className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
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
                      className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
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
