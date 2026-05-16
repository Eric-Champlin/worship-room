import { useCallback, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { useFriendPrayersToday } from '@/hooks/useFriendPrayersToday'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { CrisisResourcesBanner } from '@/components/prayer-wall/CrisisResourcesBanner'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { QuickLiftOverlay } from '@/components/prayer-wall/QuickLiftOverlay'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { PrayerRequest } from '@/types/prayer-wall'

/**
 * Spec 7.4 — Daily Hub Pray tab friend surfacing.
 *
 * Renders a small "From your friends today" section showing up to 3 recent
 * posts from the viewer's active friends that the viewer has not yet Quick
 * Lifted. Each card surfaces a single Quick Lift CTA that opens the existing
 * QuickLiftOverlay (Spec 6.2).
 *
 * Crisis-flag handling (Universal Rule 13 + Gate-G-CRISIS-FLAG-HANDLING +
 * spec MPD-4 "Watch-pattern crisis-resources banner"): per-post `crisisFlag`
 * is intentionally stripped from `PrayerRequest` (Phase 3 Addendum #7), so
 * per-post Lift-button suppression is not implementable here — the main
 * feed has the same limitation by design. The canonical aggregate pattern
 * (Spec 6.11b, `PrayerWall.tsx`) is applied: when the hook's `hasCrisisFlag`
 * is true, a `CrisisResourcesBanner` mounts above the section heading so
 * 988 / Crisis Text Line / SAMHSA hotlines are visible before the user
 * engages with any potentially crisis-flagged friend post. No LLM is
 * invoked anywhere on this surface — `.claude/rules/CRITICAL_NO_AI_AUTO_REPLY.md`
 * is satisfied by absence (the surface is pure-read + Quick Lift trigger).
 *
 * Auth-gated at the component level — does not mount for unauthenticated
 * users (MPD-7). The hook is also gated via the `enabled` arg so no 401 is
 * produced in the console for logged-out viewers.
 */

const PREVIEW_CHARS = 140

const COPY = {
  heading: 'From your friends today',
  // Plan-Time Divergence #6 — the API response shape can't distinguish "no
  // friends" vs "no recent posts" vs "all already lifted" from the empty
  // array. Single anti-pressure copy covers all three branches. If a future
  // spec plumbs an empty-reason via meta, restore the distinct strings from
  // git history.
  empty:
    "Your friends haven't shared anything today. Quiet days are part of the rhythm.",
  liftButton: 'Lift',
  liftButtonAriaLabel: 'Quick Lift in prayer (30 seconds)',
  detailLink: 'Open in Prayer Wall',
  loadingLabel: 'Loading friend prayers',
}

export function FriendPrayersToday() {
  const { isAuthenticated } = useAuth()
  const { posts, isLoading, error, hasCrisisFlag, dismissPost } =
    useFriendPrayersToday(isAuthenticated)
  const [openLiftPostId, setOpenLiftPostId] = useState<string | null>(null)
  const { recordActivity } = useFaithPoints()

  const handleOpenLift = useCallback((postId: string) => {
    setOpenLiftPostId(postId)
  }, [])

  const handleCloseLift = useCallback(() => {
    setOpenLiftPostId(null)
  }, [])

  const handleCompleteLift = useCallback(() => {
    if (openLiftPostId) {
      // Spec 6.2 — backend records the activity inside its /complete
      // transaction (W7 atomicity). skipBackendDualWrite prevents
      // postActivityToBackend() from double-inserting. Mirrors
      // InteractionBar.tsx line 415.
      recordActivity('quickLift', 'friend-prayers-today', {
        skipBackendDualWrite: true,
      })
      dismissPost(openLiftPostId)
    }
  }, [openLiftPostId, recordActivity, dismissPost])

  // MPD-7: component does not mount for unauthenticated viewers. The hook
  // also short-circuits, but the cleaner pattern is to bail early so the
  // heading + section chrome never render either.
  if (!isAuthenticated) return null

  if (isLoading) {
    return (
      <section
        aria-labelledby="friend-prayers-heading"
        className="mx-auto w-full max-w-2xl px-4 pb-8 sm:pb-10"
      >
        <h2
          id="friend-prayers-heading"
          className="mb-3 text-sm font-medium tracking-[0.15em] text-violet-300 uppercase"
        >
          {COPY.heading}
        </h2>
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <span className="sr-only">{COPY.loadingLabel}</span>
          <div className="h-24 rounded-3xl bg-white/[0.04] motion-safe:animate-shimmer motion-reduce:opacity-60" />
        </div>
      </section>
    )
  }

  if (error) {
    // Soft failure — render nothing. Anti-pressure: the Pray tab is a
    // comfort surface; an inline error banner here would feel intrusive.
    // The next mount will retry the fetch automatically.
    return null
  }

  if (posts.length === 0) {
    return (
      <section
        aria-labelledby="friend-prayers-heading"
        className="mx-auto w-full max-w-2xl px-4 pb-8 sm:pb-10"
      >
        {hasCrisisFlag ? <CrisisResourcesBanner /> : null}
        <h2
          id="friend-prayers-heading"
          className="mb-3 text-sm font-medium tracking-[0.15em] text-violet-300 uppercase"
        >
          {COPY.heading}
        </h2>
        <p className="text-sm text-white/60 sm:text-base">{COPY.empty}</p>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="friend-prayers-heading"
      className="mx-auto w-full max-w-2xl px-4 pb-8 sm:pb-10"
    >
      {hasCrisisFlag ? <CrisisResourcesBanner /> : null}
      <h2
        id="friend-prayers-heading"
        className="mb-3 text-sm font-medium tracking-[0.15em] text-violet-300 uppercase"
      >
        {COPY.heading}
      </h2>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.id}>
            <FriendPrayerCard post={post} onLiftClick={handleOpenLift} />
          </li>
        ))}
      </ul>
      {openLiftPostId ? (
        <QuickLiftOverlay
          isOpen
          postId={openLiftPostId}
          postExcerpt={
            posts.find((p) => p.id === openLiftPostId)?.content ?? ''
          }
          onCancel={handleCloseLift}
          onComplete={handleCompleteLift}
        />
      ) : null}
    </section>
  )
}

interface FriendPrayerCardProps {
  post: PrayerRequest
  onLiftClick: (postId: string) => void
}

function FriendPrayerCard({ post, onLiftClick }: FriendPrayerCardProps) {
  const preview =
    post.content.length > PREVIEW_CHARS
      ? `${post.content.slice(0, PREVIEW_CHARS).trimEnd()}…`
      : post.content
  const detailUrl = `/prayer-wall/${post.id}`
  return (
    <FrostedCard variant="default" className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="font-medium text-white/70">{post.authorName}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap break-words text-white sm:text-base">
            {preview}
          </p>
          {post.scriptureReference ? (
            <p className="mt-2 text-xs text-violet-300">
              {post.scriptureReference}
            </p>
          ) : null}
          <Link
            to={detailUrl}
            className="mt-2 inline-block text-xs text-white/50 hover:text-white/70"
          >
            Open in Prayer Wall
          </Link>
        </div>
        <button
          type="button"
          onClick={() => onLiftClick(post.id)}
          className={cn(
            'flex h-11 min-w-[80px] items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-hero-bg',
            'hover:bg-gray-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'active:scale-[0.98] transition-transform',
          )}
          aria-label="Quick Lift in prayer (30 seconds)"
        >
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          <span>Lift</span>
        </button>
      </div>
    </FrostedCard>
  )
}
