import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  shouldShowCounselorBridge,
  markCounselorBridgeDismissed,
} from '@/services/counselor-bridge-storage'

/**
 * Spec 7.5 — Quiet bridge offering /local-support/counselors when the user
 * composes a Mental Health prayer request.
 *
 * Render condition is enforced by the parent (InlineComposer), which only
 * mounts this component when postType === 'prayer_request' AND
 * selectedCategory === 'mental-health'. This component additionally checks
 * shouldShowCounselorBridge() on mount and returns null if the user has
 * dismissed it in the current session.
 *
 * Architectural note: This component is intentionally NOT imported by
 * CommentInput.tsx (the reply composer used in PrayerDetail). Comment
 * replies do not have a postType / category and would not satisfy the
 * bridge's trigger conditions. Do not import this into CommentInput
 * without revisiting Gate-G-MH-OMISSION-RESPECTED and the brand voice
 * review in the spec.
 *
 * Visual treatment per Spec 7.5 MPD-3 (with Recon Addendum item 1 / Spec-10A
 * correction): no surrounding card / panel / border / background; only an
 * inline icon + link + dismiss button. Link color is
 * text-violet-300 hover:text-violet-200 (post-Spec-10A canonical), NOT
 * text-primary (which CrisisBanner uses but is on the deprecated list).
 */
export function CounselorBridge() {
  const [visible, setVisible] = useState<boolean>(() =>
    shouldShowCounselorBridge(),
  )

  const handleDismiss = useCallback(() => {
    markCounselorBridgeDismissed()
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      className="mt-3 flex items-center gap-2 text-sm text-white/70"
      data-testid="counselor-bridge"
    >
      <Heart
        className="h-4 w-4 flex-shrink-0 text-white/50"
        aria-hidden="true"
      />
      <Link
        to="/local-support/counselors"
        className={cn(
          'underline underline-offset-2',
          'text-violet-300 hover:text-violet-200',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-violet-300/60 focus-visible:ring-offset-2',
          'focus-visible:ring-offset-hero-bg rounded-sm',
        )}
      >
        Find a counselor near you &rarr;
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          'ml-auto inline-flex h-11 w-11 items-center justify-center',
          'rounded-full text-white/40 hover:text-white/70',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-white/50',
        )}
        aria-label="Dismiss counselor suggestion"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
