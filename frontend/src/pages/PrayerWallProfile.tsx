import { useState, useCallback, useEffect, useMemo } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, MessageCircle } from 'lucide-react'
import { SEO } from '@/components/SEO'
import { PRAYER_WALL_PROFILE_METADATA } from '@/lib/seo/routeMetadata'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { PresenceIndicator } from '@/components/prayer-wall/PresenceIndicator'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SkeletonCard } from '@/components/skeletons/SkeletonCard'
import { SkeletonText } from '@/components/skeletons/SkeletonText'
import { cn } from '@/lib/utils'
import { formatFullDate } from '@/lib/time'
import { useAuth } from '@/hooks/useAuth'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import { useToast } from '@/components/ui/Toast'
import {
  getMockUser,
  getMockPrayers,
  getMockAllComments,
  getMockComments,
} from '@/mocks/prayer-wall-mock-data'
import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { ApiError } from '@/types/auth'
import { mapApiErrorToToast } from '@/lib/prayer-wall/apiErrors'
import type { PrayerRequest } from '@/types/prayer-wall'

type ProfileTab = 'prayers' | 'replies' | 'reactions'

const tabs: { key: ProfileTab; label: string }[] = [
  { key: 'prayers', label: 'Prayers' },
  { key: 'replies', label: 'Replies' },
  { key: 'reactions', label: 'Reactions' },
]

function PrayerWallProfileContent() {
  const { id } = useParams<{ id: string }>()
  // Flag-off: synchronous lookup. Flag-on: no profile endpoint exists yet
  // (Phase 8.1 ships /api/v1/users/:username) — fall back to a placeholder
  // chrome derived from the first loaded post (or generic "Profile" label).
  const flagOn = isBackendPrayerWallEnabled()
  const mockProfileUser = id && !flagOn ? getMockUser(id) : undefined
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>('prayers')
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const { showToast } = useToast()
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()

  const allPrayers = useMemo(() => getMockPrayers(), [])

  const handleTogglePraying = useCallback(
    (prayerId: string) => {
      const wasPraying = togglePraying(prayerId)
      if (!wasPraying) {
        // Only count as intercession if not praying for own prayer
        const prayer = allPrayers.find((p) => p.id === prayerId)
        if (prayer?.userId !== currentUser?.id) {
          const badgeData = getBadgeData()
          saveBadgeData({
            ...badgeData,
            activityCounts: {
              ...badgeData.activityCounts,
              intercessionCount: badgeData.activityCounts.intercessionCount + 1,
            },
          })
        }
      }
    },
    [togglePraying, allPrayers, currentUser]
  )

  const allComments = getMockAllComments()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(() => (flagOn ? [] : allPrayers))

  // Per-tab fetch state for flag-on prayers tab.
  const [apiUserPrayers, setApiUserPrayers] = useState<PrayerRequest[]>([])
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(false)
  const [prayersError, setPrayersError] = useState<{
    message: string
    severity: 'error' | 'warning' | 'info'
  } | null>(null)
  const [prayersReloadTrigger, setPrayersReloadTrigger] = useState(0)
  // Spec 6.11b — Gate-G-CRISIS-SUPPRESSION. Suppresses PresenceIndicator if any
  // post on the rendered profile feed has crisisFlag=true.
  const [hasCrisisFlag, setHasCrisisFlag] = useState(false)

  // Fetch user's prayers in flag-on mode.
  // TODO(Phase 8.1): swap to prayerWallApi.listAuthorPosts(username, ...)
  // once usernames ship on AuthUser. Today the route param is a UUID, so we
  // over-fetch listPosts and filter client-side by userId.
  useEffect(() => {
    if (activeTab !== 'prayers') return
    if (!flagOn || !id) return
    let cancelled = false
    async function loadPrayers() {
      setIsLoadingPrayers(true)
      setPrayersError(null)
      try {
        const result = await prayerWallApi.listPosts({ page: 1, limit: 50, sort: 'recent' })
        if (cancelled) return
        const filtered = result.posts.filter((p) => p.userId === id && !p.isAnonymous)
        setApiUserPrayers(filtered)
        // Spec 6.11b — page-level suppression flag. Conservative: any flagged post
        // anywhere in the response (NOT just the filtered subset) triggers suppression
        // because the helper looked at the raw fetched DTOs.
        setHasCrisisFlag(result.hasCrisisFlag)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setPrayersError(mapApiErrorToToast(err))
        } else {
          setPrayersError({
            message: 'Something went wrong. Try again in a moment.',
            severity: 'error',
          })
        }
      } finally {
        if (!cancelled) setIsLoadingPrayers(false)
      }
    }
    loadPrayers()
    return () => {
      cancelled = true
    }
  }, [activeTab, id, flagOn, prayersReloadTrigger])

  // Profile chrome: flag-on derives from first loaded post; flag-off uses mock.
  const profileChrome = useMemo(() => {
    if (!flagOn) {
      return mockProfileUser
        ? {
            id: mockProfileUser.id,
            firstName: mockProfileUser.firstName,
            lastName: mockProfileUser.lastName,
            avatarUrl: mockProfileUser.avatarUrl,
            bio: mockProfileUser.bio,
            joinedDate: mockProfileUser.joinedDate,
          }
        : null
    }
    // Flag-on: derive from first loaded post (best-effort until Phase 8.1).
    const firstPost = apiUserPrayers[0]
    if (!firstPost) return null
    const [firstName = '', ...rest] = (firstPost.authorName ?? '').split(' ')
    return {
      id: id ?? '',
      firstName: firstName || 'Profile',
      lastName: rest.join(' '),
      avatarUrl: firstPost.authorAvatarUrl ?? null,
      bio: null as string | null,
      joinedDate: firstPost.createdAt,
    }
  }, [flagOn, mockProfileUser, apiUserPrayers, id])

  const handleSubmitComment = useCallback(
    async (prayerId: string, content: string, idempotencyKey?: string): Promise<boolean> => {
      if (!isBackendPrayerWallEnabled()) {
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId
              ? {
                  ...p,
                  commentCount: p.commentCount + 1,
                  lastActivityAt: new Date().toISOString(),
                }
              : p
          )
        )
        showToast('Comment shared.')
        return true
      }
      try {
        await prayerWallApi.createComment(prayerId, content, idempotencyKey)
        const bump = (list: PrayerRequest[]): PrayerRequest[] =>
          list.map((p) =>
            p.id === prayerId
              ? { ...p, commentCount: p.commentCount + 1, lastActivityAt: new Date().toISOString() }
              : p
          )
        setPrayers(bump)
        setApiUserPrayers(bump)
        showToast('Comment shared.')
        return true
      } catch (err) {
        // CommentInput hides the submit affordance for anonymous viewers, so
        // AnonymousWriteAttemptError is unreachable here in practice. Route
        // every catchable ApiError through the canonical toast taxonomy
        // (Universal Rule 11 — no new copy strings at the page layer).
        if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [showToast]
  )

  // Flag-off: if the mock lookup didn't return a user, render not-found.
  // Flag-on: don't short-circuit here — user discovery is best-effort until
  // Phase 8.1 ships the profile endpoint, and the prayers fetch may still be
  // in flight. The render branches below handle loading/error/empty cases.
  if (!flagOn && !mockProfileUser) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6">
          <div className="mb-6">
            <Breadcrumb
              items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'User Profile' }]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <FeatureEmptyState
            icon={AlertCircle}
            heading="User not found"
            description="This profile doesn't exist or has been removed."
          />
        </main>
      </PageShell>
    )
  }

  const userPrayers = flagOn
    ? apiUserPrayers
    : prayers.filter((p) => p.userId === id && !p.isAnonymous)
  // Replies tab — flag-on has no list-my-comments endpoint yet (gap mirrors
  // PrayerWallDashboard.comments). Flag-off keeps the existing mock filter.
  const userComments = flagOn ? [] : allComments.filter((c) => c.userId === id)
  // Reactions are private per-user data — only show for the profile owner.
  // In mock mode we have no per-user reaction data, so this tab is always
  // empty. Flag-on stays empty as well: there is no per-user reactions
  // endpoint yet (followups §25 in `_plans/post-1.10-followups.md` tracks
  // `GET /api/v1/users/me/reactions/posts` which would close the gap).
  const reactedPrayers: typeof allPrayers = []

  return (
    <PageShell>
      {/* BB-40: dynamic title overrides static base; ogImage/alt from constant */}
      <SEO
        {...PRAYER_WALL_PROFILE_METADATA}
        title={profileChrome ? `${profileChrome.firstName}'s Prayers` : 'Prayer Wall Profile'}
        description={
          profileChrome
            ? `Prayers shared by ${profileChrome.firstName} on the Worship Room community prayer wall.`
            : 'A profile on the Worship Room community prayer wall.'
        }
      />
      <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6 sm:pb-8">
        <div className="mb-6 flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4" data-testid="feed-header">
          <Breadcrumb
            items={[
              { label: 'Prayer Wall', href: '/prayer-wall' },
              { label: profileChrome ? `${profileChrome.firstName}'s Profile` : 'Profile' },
            ]}
            maxWidth="max-w-[720px]"
          />
          {/* Spec 6.11b — Live Presence indicator. Suppressed on profiles with any flagged post. */}
          <PresenceIndicator suppressed={hasCrisisFlag} />
        </div>

        {/* Profile header */}
        <header className="mb-6 flex flex-col items-center text-center">
          <Avatar
            firstName={profileChrome?.firstName ?? 'P'}
            lastName={profileChrome?.lastName ?? ''}
            avatarUrl={profileChrome?.avatarUrl ?? null}
            size="lg"
            userId={profileChrome?.id ?? id ?? ''}
            alt={profileChrome ? `${profileChrome.firstName}'s profile photo` : 'Profile photo'}
          />
          <h1 className="mt-3 text-xl font-semibold text-white">
            {profileChrome?.firstName ?? 'Profile'}
          </h1>
          {profileChrome?.bio && (
            <p className="mt-2 max-w-md text-white/70">{profileChrome.bio}</p>
          )}
          {profileChrome?.joinedDate && (
            <p className="mt-1 text-sm text-white/60">
              Joined: {formatFullDate(profileChrome.joinedDate)}
            </p>
          )}
        </header>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Profile tabs"
          className="relative mb-6 flex border-b border-white/10"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`profile-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`profile-tabpanel-${tab.key}`}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => {
                let nextIndex = index
                if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
                else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
                else if (e.key === 'Home') nextIndex = 0
                else if (e.key === 'End') nextIndex = tabs.length - 1
                else return
                e.preventDefault()
                setActiveTab(tabs[nextIndex].key)
                document.getElementById(`profile-tab-${tabs[nextIndex].key}`)?.focus()
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                activeTab === tab.key ? 'text-white' : 'text-white/60 hover:text-white/80'
              )}
            >
              {tab.label}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-0.5 bg-primary motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-standard"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${tabs.findIndex((t) => t.key === activeTab) * 100}%)`,
            }}
            aria-hidden="true"
          />
        </div>

        {/* Tab content */}
        <div
          role="tabpanel"
          id={`profile-tabpanel-${activeTab}`}
          aria-labelledby={`profile-tab-${activeTab}`}
          className="motion-safe:animate-tab-fade-in"
          key={activeTab}
        >
          {activeTab === 'prayers' && (
            <div className="flex flex-col gap-4">
              {flagOn && isLoadingPrayers ? (
                <div aria-busy="true">
                  <span className="sr-only">Loading</span>
                  {[0, 1, 2].map((i) => (
                    <SkeletonCard key={i} className="mb-3">
                      <SkeletonText lines={3} />
                    </SkeletonCard>
                  ))}
                </div>
              ) : flagOn && prayersError ? (
                <FeatureEmptyState
                  icon={AlertCircle}
                  heading="We couldn't load this profile"
                  description={prayersError.message}
                  ctaLabel="Try again"
                  onCtaClick={() => {
                    setPrayersError(null)
                    setPrayersReloadTrigger((n) => n + 1)
                  }}
                  compact
                />
              ) : userPrayers.length > 0 ? (
                userPrayers.map((prayer) => (
                  <PrayerCard key={prayer.id} prayer={prayer}>
                    <InteractionBar
                      prayer={prayer}
                      reactions={reactions[prayer.id]}
                      onTogglePraying={() => handleTogglePraying(prayer.id)}
                      onToggleComments={() => handleToggleComments(prayer.id)}
                      onToggleBookmark={() => toggleBookmark(prayer.id)}
                      isCommentsOpen={openComments.has(prayer.id)}
                    />
                    {/*
                      Spec 4.4 — `onResolve` intentionally NOT passed here.
                      A profile shows another user's posts (the viewer is not
                      the author), so the "This helped" button conditional in
                      CommentItem hides the button anyway. If a viewer ever lands
                      on their own profile, they should resolve via PrayerDetail
                      or the main feed where local comment state powers the
                      optimistic update. See `_plans/post-wave-followups.md` §31.
                    */}
                    <CommentsSection
                      prayerId={prayer.id}
                      isOpen={openComments.has(prayer.id)}
                      comments={flagOn ? [] : getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
                      postType={prayer.postType}
                      postAuthorId={prayer.userId}
                    />
                  </PrayerCard>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-white/50">
                  This person hasn't shared any prayers yet.
                </p>
              )}
            </div>
          )}

          {activeTab === 'replies' && (
            <div className="flex flex-col gap-3">
              {flagOn ? (
                <FeatureEmptyState
                  icon={MessageCircle}
                  heading="Replies are coming soon"
                  description="We'll show this person's replies in a future update."
                  compact
                />
              ) : userComments.length > 0 ? (
                userComments.map((comment) => (
                  <FrostedCard key={comment.id} variant="default" className="p-4">
                    <p className="whitespace-pre-wrap text-sm text-white/80">{comment.content}</p>
                    <Link
                      to={`/prayer-wall/${comment.prayerId}`}
                      className="mt-2 block text-xs text-violet-300 hover:text-violet-200 hover:underline"
                    >
                      View prayer
                    </Link>
                  </FrostedCard>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-white/50">No replies yet.</p>
              )}
            </div>
          )}

          {activeTab === 'reactions' && (
            <div className="flex flex-col gap-4">
              {reactedPrayers.length > 0 ? (
                reactedPrayers.map((prayer) => (
                  <PrayerCard key={prayer.id} prayer={prayer}>
                    <InteractionBar
                      prayer={prayer}
                      reactions={reactions[prayer.id]}
                      onTogglePraying={() => handleTogglePraying(prayer.id)}
                      onToggleComments={() => handleToggleComments(prayer.id)}
                      onToggleBookmark={() => toggleBookmark(prayer.id)}
                      isCommentsOpen={openComments.has(prayer.id)}
                    />
                    {/* Reactions tab — viewing others' prayers; never the post author here. */}
                    <CommentsSection
                      prayerId={prayer.id}
                      isOpen={openComments.has(prayer.id)}
                      comments={getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
                      postType={prayer.postType}
                      postAuthorId={prayer.userId}
                    />
                  </PrayerCard>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-white/50">No reactions yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  )
}

export function PrayerWallProfile() {
  const { isOnline } = useOnlineStatus()

  if (!isOnline) {
    return (
      <OfflineNotice
        featureName="Prayer Wall"
        fallbackRoute="/daily"
        fallbackLabel="Go to Daily Hub"
      />
    )
  }

  return <PrayerWallProfileContent />
}
