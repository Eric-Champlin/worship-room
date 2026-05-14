import { useState, useCallback, useRef, useEffect } from 'react'
import { Bookmark, Check, HandHelping, Heart, Hourglass, MessageCircle, Plus, Share2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useAuthModal } from './AuthModalProvider'
import { usePrayerCardPulse, useIntercessorActions } from './PrayerCard'
import { QuickLiftOverlay } from './QuickLiftOverlay'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useTestimonyShare } from '@/hooks/useTestimonyShare'
import { ShareDropdown, getShareText } from './ShareDropdown'
import { CelebrateReaction } from './CelebrateReaction'
import type { PostType } from '@/constants/post-types'
import type { PrayerRequest, PrayerReaction } from '@/types/prayer-wall'
import {
  PRAISING_LABEL,
  PRAISING_ACTIVE_ARIA_LABEL,
  PRAISING_INACTIVE_ARIA_LABEL,
} from '@/constants/answered-wall-copy'

// Spec 4.6 — per-type reaction labels and icons. Module-scope (stable across
// renders, O(1) lookup at render time, no memoization needed). Encouragement
// uses Heart + "Send thanks" semantics; the other 4 post types share the
// HandHelping + "Pray" semantics that pre-dated 4.6. Phase 6 may refine
// testimony to "Amen" + Sparkles per post-wave-followups §29.
const REACTION_LABEL_BY_TYPE: Record<
  PostType,
  { active: string; inactive: string; floatingText: string }
> = {
  prayer_request: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },
  testimony: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },
  question: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },
  discussion: { active: 'Stop praying', inactive: 'Pray', floatingText: '+1 prayer' },
  encouragement: { active: 'Remove thanks', inactive: 'Send thanks', floatingText: '+1 thanks' },
}

const REACTION_ICON_BY_TYPE: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: HandHelping,
  question: HandHelping,
  discussion: HandHelping,
  encouragement: Heart,
}

interface InteractionBarProps {
  prayer: PrayerRequest
  reactions: PrayerReaction | undefined
  onTogglePraying: () => void
  onToggleComments: () => void
  onToggleBookmark: () => void
  isCommentsOpen: boolean
  onToggleSave?: () => void
  isSaved?: boolean
  /** Spec 6.6 — Answered Wall: when true, render the "Praising with you"
   *  button alongside the praying button. Explicit prop (not auto-detected
   *  from prayer.isAnswered) so the rendering surface stays in caller control. */
  showPraising?: boolean
  /** Spec 6.6 — called when the user taps the "Praising with you" button.
   *  Required when showPraising=true; caller wires to togglePraising(prayer.id). */
  onTogglePraising?: () => void
  /** Spec 6.6b — Answered Wall: when true, render the Celebrate reaction
   *  button. Explicit prop (callers MUST gate on prayer.isAnswered themselves
   *  per W11 — celebrate is not surfaced on non-answered posts). */
  showCelebrate?: boolean
  /** Spec 6.6b — called when the user taps the Celebrate button.
   *  Required when showCelebrate=true; caller wires to toggleCelebrate(prayer.id). */
  onToggleCelebrate?: () => void
}

const btnBase =
  'flex items-center gap-1 text-sm min-h-[44px] min-w-[44px] justify-center transition-[colors,transform] duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded active:scale-[0.98]'

export function InteractionBar({
  prayer,
  reactions,
  onTogglePraying,
  onToggleComments,
  onToggleBookmark,
  isCommentsOpen,
  onToggleSave,
  isSaved,
  showPraising = false,
  onTogglePraising,
  showCelebrate = false,
  onToggleCelebrate,
}: InteractionBarProps) {
  const { isAuthenticated, user } = useAuth()
  const authModal = useAuthModal()
  const { playSoundEffect } = useSoundEffects()
  const triggerPulse = usePrayerCardPulse()
  // Spec 6.5 — when mounted under a PrayerCard, drive the Intercessor
  // Timeline's optimistic state on praying toggles. Null when mounted
  // outside a PrayerCard (e.g., bare InteractionBar tests) — handler
  // null-checks before calling.
  const intercessorActions = useIntercessorActions()
  const { recordActivity } = useFaithPoints()
  const isPraying = reactions?.isPraying ?? false
  const isBookmarked = reactions?.isBookmarked ?? false
  const isPraising = reactions?.isPraising ?? false
  const isCelebrating = reactions?.isCelebrating ?? false

  const [isAnimating, setIsAnimating] = useState(false)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Spec 6.2 — Quick Lift overlay open state. Local-only; the session itself
  // lives on the server.
  const [quickLiftOpen, setQuickLiftOpen] = useState(false)

  const handlePrayClick = useCallback(() => {
    if (isPraying) {
      // Untoggle — cancel any running ceremony animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
        animationTimeoutRef.current = null
      }
      setIsAnimating(false)
      onTogglePraying()
      // Spec 6.5 — keep the Intercessor Timeline in sync. Viewer always
      // sees their own entry by display name (per IntercessorService self-case),
      // so we remove by the viewer's userId.
      if (intercessorActions && user) {
        intercessorActions.optimisticRemove(user.id)
      }
      return
    }
    // Toggle ON — start ceremony
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }
    setIsAnimating(true)
    onTogglePraying()
    playSoundEffect('whisper')
    triggerPulse?.()
    // Spec 6.5 — optimistic insert at the top of the timeline. Viewer
    // self-classification is always named per IntercessorService — see
    // classifyEntry's self-case. displayName uses user.displayName so the
    // user reads the same name they see elsewhere in the app.
    if (intercessorActions && user) {
      intercessorActions.optimisticInsert({
        userId: user.id,
        displayName: user.displayName,
        isAnonymous: false,
        reactedAt: new Date().toISOString(),
      })
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, ANIMATION_DURATIONS.ceremony)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- triggerPulse is stable context ref
  }, [isPraying, onTogglePraying, playSoundEffect, intercessorActions, user])

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    }
  }, [])

  const [shareOpen, setShareOpen] = useState(false)

  // Spec 6.7 — testimony-share orchestration. The hook is invoked
  // unconditionally per React's rules of hooks; the *gating* (whether a
  // usable callback reaches ShareDropdown) is at the callback wiring below
  // (`isTestimony ? testimonyShare.initiateShare : undefined`) and at the
  // portal render (`isTestimony && testimonyShare.portal`). Non-testimony
  // posts pay only the per-render setup cost — nothing renders, nothing
  // fires until the menu item is tapped, which never happens for non-
  // testimony surfaces because the menu item is absent.
  const testimonyShare = useTestimonyShare(prayer)
  const isTestimony = prayer.postType === 'testimony'

  const handleShareClick = useCallback(async () => {
    // Try native share on mobile devices only
    const isMobile = window.innerWidth < 640
    if (isMobile && navigator.share) {
      const shareUrl = `${window.location.origin}/prayer-wall/${prayer.id}`
      try {
        await navigator.share({
          title: 'Prayer Request',
          text: getShareText(prayer.content),
          url: shareUrl,
        })
        return
      } catch (_e) {
        // Fall through to dropdown if native share fails/cancels
      }
    }
    setShareOpen((prev) => !prev)
  }, [prayer.id, prayer.content])

  // Spec 4.6 — resolve per-type reaction labels and icon at render scope so all
  // reads are coherent (label, icon, floating text all from the same map entry).
  const labels = REACTION_LABEL_BY_TYPE[prayer.postType]
  const Icon = REACTION_ICON_BY_TYPE[prayer.postType]
  const isEncouragement = prayer.postType === 'encouragement'
  const reactionAriaLabel = isPraying
    ? isEncouragement
      ? `${labels.active} (${prayer.prayingCount} praying)`
      : `Stop praying for this request (${prayer.prayingCount} praying)`
    : isEncouragement
      ? `Send thanks for this encouragement (${prayer.prayingCount} praying)`
      : `Pray for this request (${prayer.prayingCount} praying)`

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 sm:gap-4">
      {/* Pray/Reaction button wrapper — relative for absolute-positioned animation elements */}
      <div className="relative">
        <button
          type="button"
          onClick={handlePrayClick}
          className={cn(
            btnBase,
            isPraying ? 'font-medium text-violet-300' : 'text-white/50 hover:text-violet-300',
          )}
          aria-label={reactionAriaLabel}
          aria-pressed={isPraying}
        >
          <Icon
            className={cn(
              'h-4 w-4',
              isAnimating && 'motion-safe:animate-pray-icon-pulse',
            )}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">({prayer.prayingCount})</span>
        </button>

        {/* Ripple — absolutely positioned circle behind button */}
        {isAnimating && (
          <span
            className="pointer-events-none absolute inset-0 motion-safe:animate-pray-ripple rounded-full bg-primary/30"
            aria-hidden="true"
          />
        )}

        {/* Floating "+1 prayer" / "+1 thanks" text */}
        {isAnimating && (
          <span
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-sans text-violet-300 motion-safe:animate-pray-float-text"
            aria-hidden="true"
          >
            {labels.floatingText}
          </span>
        )}
      </div>

      {/* Spec 6.6 — "Praising with you" button (Answered Wall). Renders only when
          the caller passes `showPraising={true}`. Auth-gated like the other write
          actions; falls back to the auth modal when logged-out. Uses the same
          reactionsStore as praying/candle via `onTogglePraising` from the caller. */}
      {showPraising && (
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              authModal?.openAuthModal('Sign in to praise with the community.')
              return
            }
            onTogglePraising?.()
            triggerPulse?.()
            playSoundEffect('sparkle')
          }}
          className={cn(
            btnBase,
            isPraising ? 'font-medium text-violet-300' : 'text-white/50 hover:text-violet-300',
          )}
          aria-label={isPraising ? PRAISING_ACTIVE_ARIA_LABEL : PRAISING_INACTIVE_ARIA_LABEL}
          aria-pressed={isPraising}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">
            {PRAISING_LABEL} ({prayer.praisingCount ?? 0})
          </span>
        </button>
      )}

      {/* Spec 6.6b — Celebrate reaction (Answered Wall warm sunrise). Renders only
          when the caller passes `showCelebrate={true}`; callers MUST gate on
          prayer.isAnswered themselves per W11 (celebrate is not surfaced on
          non-answered posts). Distinct from Praising — separate reaction type
          with its own per-post counter on the backend. */}
      {showCelebrate && (
        <CelebrateReaction
          isActive={isCelebrating}
          count={prayer.celebrateCount ?? 0}
          onToggle={() => onToggleCelebrate?.()}
        />
      )}

      {/* Comment button — Spec 4.6: hidden entirely for encouragement (W6/D12) */}
      {!isEncouragement && (
        <button
          type="button"
          onClick={onToggleComments}
          className={cn(btnBase, 'text-white/50 hover:text-white/70')}
          aria-label={`Comments, ${prayer.commentCount} ${prayer.commentCount === 1 ? 'comment' : 'comments'}`}
          aria-expanded={isCommentsOpen}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">({prayer.commentCount})</span>
        </button>
      )}

      {/* Bookmark button */}
      {isAuthenticated ? (
        <button
          type="button"
          onClick={() => { onToggleBookmark(); triggerPulse?.() }}
          className={cn(
            btnBase,
            isBookmarked
              ? 'text-violet-300'
              : 'text-white/50 hover:text-violet-300',
          )}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this prayer'}
          aria-pressed={isBookmarked}
        >
          <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-primary')} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => authModal?.openAuthModal()}
          className={cn(btnBase, 'text-white/50 hover:text-violet-300')}
          aria-label="Log in to bookmark"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Share button */}
      <div className="relative">
        <button
          type="button"
          onClick={handleShareClick}
          className={cn(btnBase, 'text-white/50 hover:text-white/70')}
          aria-label="Share this prayer"
          aria-haspopup="menu"
          aria-expanded={shareOpen}
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <ShareDropdown
          prayerId={prayer.id}
          prayerContent={prayer.content}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onShareAsImage={
            isTestimony ? testimonyShare.initiateShare : undefined
          }
        />
        {isTestimony && testimonyShare.portal}
      </div>

      {/* Save button */}
      {isSaved ? (
        <span className={cn(btnBase, 'text-white/50 cursor-default')} aria-label="Saved to your prayer list">
          <Check className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Saved</span>
        </span>
      ) : isAuthenticated ? (
        <button
          type="button"
          onClick={() => { onToggleSave?.(); triggerPulse?.() }}
          className={cn(btnBase, 'text-white/50 hover:text-violet-300')}
          aria-label="Save to your prayer list"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Save</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => authModal?.openAuthModal('Sign in to save prayers to your list')}
          className={cn(btnBase, 'text-white/50 hover:text-violet-300')}
          aria-label="Sign in to save to your prayer list"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Save</span>
        </button>
      )}

      {/* Quick Lift button — Spec 6.2 */}
      {isAuthenticated ? (
        <button
          type="button"
          onClick={() => setQuickLiftOpen(true)}
          className={cn(btnBase, 'text-white/50 hover:text-violet-300')}
          aria-label="Quick Lift in prayer (30 seconds)"
        >
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lift</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => authModal?.openAuthModal('Sign in to Quick Lift')}
          className={cn(btnBase, 'text-white/50 hover:text-violet-300')}
          aria-label="Sign in to Quick Lift in prayer"
        >
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lift</span>
        </button>
      )}

      <QuickLiftOverlay
        isOpen={quickLiftOpen}
        postId={prayer.id}
        postExcerpt={prayer.content}
        onCancel={() => setQuickLiftOpen(false)}
        onComplete={() => {
          // Spec 6.2 — backend recorded the activity inside its /complete
          // transaction (W7 atomicity). skipBackendDualWrite prevents the
          // default postActivityToBackend() call from double-inserting.
          recordActivity('quickLift', 'quickLift-overlay', { skipBackendDualWrite: true })
          triggerPulse?.()
        }}
      />
    </div>
  )
}
