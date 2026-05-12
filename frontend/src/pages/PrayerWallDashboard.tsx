import { useState, useCallback, useEffect, useMemo } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { Link, Navigate } from 'react-router-dom'
import { AlertCircle, Bookmark, Heart, MessageCircle, Pencil } from 'lucide-react'
import { SEO } from '@/components/SEO'
import { PRAYER_WALL_DASHBOARD_METADATA } from '@/lib/seo/routeMetadata'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { PrayerReceiptMini } from '@/components/prayer-wall/PrayerReceiptMini'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { Button } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { SkeletonCard } from '@/components/skeletons/SkeletonCard'
import { SkeletonText } from '@/components/skeletons/SkeletonText'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { formatFullDate } from '@/lib/time'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import {
  getMockPrayers,
  getMockAllComments,
  getMockComments,
  MOCK_CURRENT_USER,
} from '@/mocks/prayer-wall-mock-data'
import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { ApiError } from '@/types/auth'
import { mapApiErrorToToast } from '@/lib/prayer-wall/apiErrors'
import type { PrayerRequest } from '@/types/prayer-wall'

type DashboardTab = 'prayers' | 'comments' | 'bookmarks' | 'reactions' | 'settings'

const tabs: { key: DashboardTab; label: string }[] = [
  { key: 'prayers', label: 'My Prayers' },
  { key: 'comments', label: 'My Comments' },
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'settings', label: 'Settings' },
]

const NOTIFICATION_TYPES = [
  { key: 'pray', label: 'Someone prays for my prayer' },
  { key: 'comment', label: 'Someone comments on my prayer' },
  { key: 'mention', label: 'Someone @mentions me in a comment' },
  { key: 'answered', label: 'A prayer I prayed for is answered' },
]

function DashboardContent() {
  const { isAuthenticated, user } = useAuth()
  const { showToast } = useToast()
  const { recordActivity } = useFaithPoints()
  const [activeTab, setActiveTab] = useState<DashboardTab>('prayers')

  // dashboardUser swap (Edge Cases §4): in flag-on use the authenticated user;
  // flag-off keeps MOCK_CURRENT_USER so existing tests/regression remain stable.
  // Bio + avatarUrl + joinedDate are not yet on AuthUser — Phase 8.1 ships them.
  const dashboardUser = useMemo(() => {
    if (isBackendPrayerWallEnabled() && user) {
      return {
        id: user.id,
        firstName: user.firstName ?? user.name ?? '',
        lastName: user.lastName ?? '',
        avatarUrl: null as string | null,
        bio: null as string | null,
        joinedDate: new Date().toISOString(),
      }
    }
    return MOCK_CURRENT_USER
  }, [user])

  const [displayName, setDisplayName] = useState(dashboardUser.firstName)
  const [bio, setBio] = useState(dashboardUser.bio ?? '')
  const [editingName, setEditingName] = useState(false)
  const [editingBio, setEditingBio] = useState(false)

  const allPrayers = useMemo(() => getMockPrayers(), [])
  const allComments = getMockAllComments()
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(() =>
    isBackendPrayerWallEnabled() ? [] : allPrayers
  )
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()

  // Per-tab fetch state (flag-on only; flag-off uses synchronous mock data).
  const [apiMyPrayers, setApiMyPrayers] = useState<PrayerRequest[]>([])
  const [isLoadingPrayers, setIsLoadingPrayers] = useState(false)
  const [prayersError, setPrayersError] = useState<{
    message: string
    severity: 'error' | 'warning' | 'info'
  } | null>(null)
  const [apiBookmarkedPrayers, setApiBookmarkedPrayers] = useState<PrayerRequest[]>([])
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false)
  const [bookmarksError, setBookmarksError] = useState<{
    message: string
    severity: 'error' | 'warning' | 'info'
  } | null>(null)
  const [prayersReloadTrigger, setPrayersReloadTrigger] = useState(0)
  const [bookmarksReloadTrigger, setBookmarksReloadTrigger] = useState(0)

  // Fetch prayers tab data when activated in flag-on mode.
  // TODO(Phase 8.1): swap to prayerWallApi.listAuthorPosts(myUsername, ...)
  // once usernames ship on AuthUser. Today AuthUser has no username field, so
  // we over-fetch listPosts and filter client-side by user.id.
  useEffect(() => {
    if (activeTab !== 'prayers') return
    if (!isBackendPrayerWallEnabled()) return
    let cancelled = false
    async function loadPrayers() {
      setIsLoadingPrayers(true)
      setPrayersError(null)
      try {
        const result = await prayerWallApi.listPosts({ page: 1, limit: 50, sort: 'recent' })
        if (cancelled) return
        const filtered = user ? result.posts.filter((p) => p.userId === user.id) : []
        setApiMyPrayers(filtered)
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
  }, [activeTab, user, prayersReloadTrigger])

  // Fetch bookmarks tab data when activated in flag-on mode.
  useEffect(() => {
    if (activeTab !== 'bookmarks') return
    if (!isBackendPrayerWallEnabled()) return
    let cancelled = false
    async function loadBookmarks() {
      setIsLoadingBookmarks(true)
      setBookmarksError(null)
      try {
        const result = await prayerWallApi.listMyBookmarks({ page: 1, limit: 50 })
        if (cancelled) return
        setApiBookmarkedPrayers(result.posts)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError) {
          setBookmarksError(mapApiErrorToToast(err))
        } else {
          setBookmarksError({
            message: 'Something went wrong. Try again in a moment.',
            severity: 'error',
          })
        }
      } finally {
        if (!cancelled) setIsLoadingBookmarks(false)
      }
    }
    loadBookmarks()
    return () => {
      cancelled = true
    }
  }, [activeTab, bookmarksReloadTrigger])

  const handleTogglePraying = useCallback(
    (prayerId: string) => {
      const wasPraying = togglePraying(prayerId)
      if (!wasPraying) {
        recordActivity('prayerWall', 'prayer_wall')
        // Only count as intercession if not praying for own prayer
        const prayer = prayers.find((p) => p.id === prayerId)
        if (prayer?.userId !== user?.id) {
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
    [togglePraying, recordActivity, prayers, user]
  )

  const handleMarkAnswered = useCallback(
    async (prayerId: string, praiseText: string) => {
      if (!isBackendPrayerWallEnabled()) {
        setPrayers((prev) =>
          prev.map((p) =>
            p.id === prayerId
              ? {
                  ...p,
                  isAnswered: true,
                  answeredText: praiseText || null,
                  answeredAt: new Date().toISOString(),
                }
              : p
          )
        )
        showToast('What a testimony. God is faithful.')
        return
      }
      try {
        const updated = await prayerWallApi.updatePost(prayerId, {
          isAnswered: true,
          answeredText: praiseText || undefined,
        })
        const replace = (list: PrayerRequest[]): PrayerRequest[] =>
          list.map((p) => (p.id === prayerId ? updated : p))
        setPrayers(replace)
        setApiMyPrayers(replace)
        setApiBookmarkedPrayers(replace)
        showToast('What a testimony. God is faithful.')
      } catch (err) {
        if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
      }
    },
    [showToast]
  )

  const handleDelete = useCallback(
    async (prayerId: string) => {
      if (!isBackendPrayerWallEnabled()) {
        setPrayers((prev) => prev.filter((p) => p.id !== prayerId))
        showToast('Prayer removed from your list.')
        return
      }
      try {
        await prayerWallApi.deletePost(prayerId)
        const remove = (list: PrayerRequest[]): PrayerRequest[] =>
          list.filter((p) => p.id !== prayerId)
        setPrayers(remove)
        setApiMyPrayers(remove)
        setApiBookmarkedPrayers(remove)
        showToast('Prayer removed from your list.')
      } catch (err) {
        if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
      }
    },
    [showToast]
  )

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
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Comment shared.')
        return true
      }
      try {
        await prayerWallApi.createComment(prayerId, content, idempotencyKey)
        // Bump comment count on whichever per-tab list contains this prayer.
        const bump = (list: PrayerRequest[]): PrayerRequest[] =>
          list.map((p) =>
            p.id === prayerId
              ? { ...p, commentCount: p.commentCount + 1, lastActivityAt: new Date().toISOString() }
              : p
          )
        setPrayers(bump)
        setApiMyPrayers(bump)
        setApiBookmarkedPrayers(bump)
        recordActivity('prayerWall', 'prayer_wall')
        showToast('Comment shared.')
        return true
      } catch (err) {
        // Dashboard is auth-gated (Navigate to /login when !isAuthenticated),
        // so AnonymousWriteAttemptError is unreachable here in practice. Route
        // every catchable ApiError through the canonical toast taxonomy
        // (Universal Rule 11 — no new copy strings at the page layer).
        if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [showToast, recordActivity]
  )

  if (!isAuthenticated) {
    return <Navigate to="/login?returnTo=/prayer-wall/dashboard" replace />
  }

  const flagOn = isBackendPrayerWallEnabled()

  const myPrayers = flagOn ? apiMyPrayers : prayers.filter((p) => p.userId === dashboardUser.id)
  // Flag-on "My Comments" tab is a documented gap (Spec 3.10 watch-for #20):
  // backend has no /api/v1/users/me/comments endpoint yet. Render empty-tab
  // placeholder; flag-off path keeps the existing mock derivation.
  const myComments = flagOn ? [] : allComments.filter((c) => c.userId === dashboardUser.id)
  const bookmarkedPrayerIds = Object.entries(reactions)
    .filter(([, r]) => r.isBookmarked)
    .map(([id]) => id)
  const bookmarkedPrayers = flagOn
    ? apiBookmarkedPrayers
    : prayers.filter((p) => bookmarkedPrayerIds.includes(p.id))
  const reactedPrayerIds = Object.entries(reactions)
    .filter(([, r]) => r.isPraying)
    .map(([id]) => id)
  // Reactions tab — Edge Cases §2 Option A: derive from already-loaded prayers.
  // In flag-on we use the union of myPrayers + bookmarkedPrayers as the working
  // set. Reacted-but-unloaded prayers are a documented limitation (Spec 3.10
  // watch-for #21); the followups file tracks the future endpoint.
  const reactedPrayers = flagOn
    ? Array.from(
        new Map(
          [...apiMyPrayers, ...apiBookmarkedPrayers]
            .filter((p) => reactedPrayerIds.includes(p.id))
            .map((p) => [p.id, p])
        ).values()
      )
    : prayers.filter((p) => reactedPrayerIds.includes(p.id))

  return (
    <PageShell>
      <SEO {...PRAYER_WALL_DASHBOARD_METADATA} />
      <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6 sm:py-8">
        <div className="mb-6">
          <Breadcrumb
            items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'My Dashboard' }]}
            maxWidth="max-w-[720px]"
          />
        </div>

        {/* Editable profile header */}
        <header className="mb-6 flex flex-col items-center text-center">
          <Avatar
            firstName={displayName}
            lastName={dashboardUser.lastName}
            avatarUrl={null}
            size="lg"
            userId={dashboardUser.id}
            alt={`${displayName}'s profile photo`}
          />
          <button
            type="button"
            disabled
            className="mt-2 text-xs text-white/60"
            aria-label="Change photo (coming soon)"
          >
            Change Photo (coming soon)
          </button>

          {editingName ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-xl font-semibold text-white placeholder:text-white/40 focus:border-violet-400/30 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                aria-label="Display name"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingName(false)
                  showToast('Name updated.')
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">{displayName}</h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-white/50 hover:text-violet-300 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Edit name"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {editingBio ? (
            <div className="mt-2 w-full max-w-md">
              <textarea
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setBio(e.target.value)
                  }
                }}
                className="w-full resize-none rounded-lg border border-violet-400/30 bg-white/[0.04] p-3 text-sm text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                rows={3}
                aria-label="Bio"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-white/60">{bio.length}/500</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingBio(false)
                    showToast('Bio updated.')
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-2">
              <p className="max-w-md text-white/70">{bio || 'Add a bio...'}</p>
              <button
                type="button"
                onClick={() => setEditingBio(true)}
                className="mt-0.5 text-text-light hover:text-violet-300 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Edit bio"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <p className="mt-1 text-sm text-white/60">
            Joined: {formatFullDate(dashboardUser.joinedDate)}
          </p>
        </header>

        {/* Tab bar — scroll on mobile */}
        <div
          role="tablist"
          aria-label="Dashboard tabs"
          className="relative mb-6 flex overflow-x-auto border-b border-white/10"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`dashboard-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`dashboard-tabpanel-${tab.key}`}
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
                document.getElementById(`dashboard-tab-${tabs[nextIndex].key}`)?.focus()
              }}
              className={cn(
                'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
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
          id={`dashboard-tabpanel-${activeTab}`}
          aria-labelledby={`dashboard-tab-${activeTab}`}
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
                  heading="We couldn't load your prayers"
                  description={prayersError.message}
                  ctaLabel="Try again"
                  onCtaClick={() => {
                    setPrayersError(null)
                    setPrayersReloadTrigger((n) => n + 1)
                  }}
                  compact
                />
              ) : myPrayers.length > 0 ? (
                myPrayers.map((prayer) => (
                  <PrayerCard key={prayer.id} prayer={prayer}>
                    <InteractionBar
                      prayer={prayer}
                      reactions={reactions[prayer.id]}
                      onTogglePraying={() => handleTogglePraying(prayer.id)}
                      onToggleComments={() => handleToggleComments(prayer.id)}
                      onToggleBookmark={() => toggleBookmark(prayer.id)}
                      isCommentsOpen={openComments.has(prayer.id)}
                    />
                    {/* Spec 6.1 — Dashboard mini-receipt. Count + scripture
                        reference only, no avatars, no friend names (D-Dashboard-
                        mini / Gate-32 defense in depth). PrayerReceiptMini
                        internally gates and returns null otherwise. */}
                    {prayer.userId && (
                      <PrayerReceiptMini
                        postAuthorId={prayer.userId}
                        prayingCount={prayer.prayingCount ?? 0}
                      />
                    )}
                    {/*
                      Spec 4.4 — `onResolve` intentionally NOT passed here.
                      Dashboard renders comments via `getMockComments()` (or `[]`
                      when flag-on), with no local comment state to mutate
                      optimistically. Wiring resolve without local state would
                      mark the comment helpful on the backend but leave the UI
                      stale until reload, which feels broken. Authors resolve
                      from /prayer-wall or /prayer-wall/:id today; lifting this
                      gap requires Dashboard to own its own comment state.
                      Tracked in `_plans/post-wave-followups.md` §31.
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
                    {!prayer.isAnswered && (
                      <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3">
                        <MarkAsAnsweredForm
                          onConfirm={(praiseText) => handleMarkAnswered(prayer.id, praiseText)}
                        />
                        <DeletePrayerDialog onDelete={() => handleDelete(prayer.id)} />
                      </div>
                    )}
                  </PrayerCard>
                ))
              ) : (
                <FeatureEmptyState
                  icon={Heart}
                  heading="No shared prayers yet"
                  description="Share your first prayer request and invite the community to pray with you."
                  ctaLabel="Visit Prayer Wall"
                  ctaHref="/prayer-wall"
                  compact
                />
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="flex flex-col gap-3">
              {flagOn ? (
                <FeatureEmptyState
                  icon={MessageCircle}
                  heading="My comments are coming soon"
                  description="A future update will show comments you've left. For now, you can find them on each prayer."
                  ctaLabel="Visit Prayer Wall"
                  ctaHref="/prayer-wall"
                  compact
                />
              ) : myComments.length > 0 ? (
                myComments.map((comment) => (
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
                <FeatureEmptyState
                  icon={MessageCircle}
                  heading="No comments yet"
                  description="Encourage someone by commenting on their prayer."
                  ctaLabel="Visit Prayer Wall"
                  ctaHref="/prayer-wall"
                  compact
                />
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="flex flex-col gap-4">
              {flagOn && isLoadingBookmarks ? (
                <div aria-busy="true">
                  <span className="sr-only">Loading</span>
                  {[0, 1, 2].map((i) => (
                    <SkeletonCard key={i} className="mb-3">
                      <SkeletonText lines={3} />
                    </SkeletonCard>
                  ))}
                </div>
              ) : flagOn && bookmarksError ? (
                <FeatureEmptyState
                  icon={AlertCircle}
                  heading="We couldn't load your bookmarks"
                  description={bookmarksError.message}
                  ctaLabel="Try again"
                  onCtaClick={() => {
                    setBookmarksError(null)
                    setBookmarksReloadTrigger((n) => n + 1)
                  }}
                  compact
                />
              ) : bookmarkedPrayers.length > 0 ? (
                bookmarkedPrayers.map((prayer) => (
                  <PrayerCard key={prayer.id} prayer={prayer}>
                    <InteractionBar
                      prayer={prayer}
                      reactions={reactions[prayer.id]}
                      onTogglePraying={() => handleTogglePraying(prayer.id)}
                      onToggleComments={() => handleToggleComments(prayer.id)}
                      onToggleBookmark={() => toggleBookmark(prayer.id)}
                      isCommentsOpen={openComments.has(prayer.id)}
                    />
                    {/* Bookmarks tab — viewing others' prayers; never the post author here. */}
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
                <FeatureEmptyState
                  icon={Bookmark}
                  heading="No bookmarked prayers"
                  description="Bookmark prayers you want to remember or revisit."
                  ctaLabel="Visit Prayer Wall"
                  ctaHref="/prayer-wall"
                  compact
                />
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
                      comments={flagOn ? [] : getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
                      postType={prayer.postType}
                      postAuthorId={prayer.userId}
                    />
                  </PrayerCard>
                ))
              ) : (
                <FeatureEmptyState
                  icon={Heart}
                  heading="No reactions yet"
                  description="Pray for someone's request to show you care."
                  ctaLabel="Visit Prayer Wall"
                  ctaHref="/prayer-wall"
                  compact
                />
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <FrostedCard variant="default" className="p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">Notification Preferences</h2>
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
                <p className="text-sm text-amber-200">Notifications coming soon</p>
              </div>
              {NOTIFICATION_TYPES.map((type) => (
                <label
                  key={type.key}
                  className="flex items-center justify-between border-b border-white/[0.12] py-3 last:border-0"
                >
                  <span className="text-sm text-white/70">{type.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="h-4 w-4 rounded border-white/20 text-violet-300 accent-violet-300"
                  />
                </label>
              ))}
            </FrostedCard>
          )}
        </div>
      </main>
    </PageShell>
  )
}

export function PrayerWallDashboard() {
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

  return <DashboardContent />
}
