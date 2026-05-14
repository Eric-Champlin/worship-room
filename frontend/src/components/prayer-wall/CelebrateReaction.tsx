import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import {
  CELEBRATE_LABEL,
  CELEBRATE_ACTIVE_ARIA_LABEL,
  CELEBRATE_INACTIVE_ARIA_LABEL,
} from '@/constants/answered-wall-copy'

/**
 * Spec 6.6b — Celebrate reaction button (Answered Wall warm sunrise affordance).
 *
 * Distinct from Praising: a separate reaction type with its own per-post
 * counter (`celebrateCount`) backed by `post_reactions.reaction_type='celebrate'`
 * on the backend. Warm sunrise palette (amber-200 inactive, amber-300 active)
 * visually distinguishes it from Praising's violet.
 *
 * Auth-gated like the other write actions — falls back to the auth modal when
 * logged out. Plays the `sparkle` sound effect on toggle (matches Praising).
 *
 * Reduced-motion: the global `prefers-reduced-motion: reduce` rule in
 * `frontend/src/styles/animations.css` disables transitions site-wide. No
 * per-component check needed.
 *
 * Mirrors InteractionBar's existing Praising button structure for consistency
 * (Gate-G-EXTEND-NOT-DUPLICATE). Rendered by InteractionBar when the caller
 * passes `showCelebrate={true}` (typically only on answered posts).
 */
const btnBase =
  'flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded active:scale-[0.98]'

interface CelebrateReactionProps {
  isActive: boolean
  count: number
  onToggle: () => void
}

export function CelebrateReaction({ isActive, count, onToggle }: CelebrateReactionProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { playSoundEffect } = useSoundEffects()

  // Spec 6.6b — distinct sparkle-burst animation on toggle-on (plan ED-8).
  // Fired transiently for ~600ms via `animate-celebrate-sparkle` on the Star
  // icon. Distinct from Praising (which uses the card-wide `triggerPulse`) and
  // from Light-a-Candle (long-press QuickLiftOverlay). Reduced-motion is
  // handled globally by the rule in `frontend/src/styles/animations.css`.
  const [isAnimating, setIsAnimating] = useState(false)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  const handleClick = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to celebrate this answered prayer.')
      return
    }
    // Fire the sparkle burst only on toggle-on (false → true). On toggle-off
    // we play the sound but skip the animation to avoid a celebratory flourish
    // for a user retracting their celebration.
    if (!isActive) {
      setIsAnimating(true)
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
      animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 600)
    }
    onToggle()
    playSoundEffect('sparkle')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        btnBase,
        isActive
          ? 'font-medium text-amber-300'
          : 'text-amber-200/70 hover:text-amber-300',
      )}
      aria-label={isActive ? CELEBRATE_ACTIVE_ARIA_LABEL : CELEBRATE_INACTIVE_ARIA_LABEL}
      aria-pressed={isActive}
    >
      <Star
        className={cn(
          'h-4 w-4',
          isAnimating && 'motion-safe:animate-celebrate-sparkle',
        )}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">
        {CELEBRATE_LABEL} ({count})
      </span>
    </button>
  )
}
