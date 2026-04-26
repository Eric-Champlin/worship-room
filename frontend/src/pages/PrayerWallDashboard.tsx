import { useState, useCallback, useMemo } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { Link, Navigate } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, Pencil } from 'lucide-react'
import { SEO } from '@/components/SEO'
import { PRAYER_WALL_DASHBOARD_METADATA } from '@/lib/seo/routeMetadata'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { Button } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
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

  // TODO(phase-3): fetch real user profile from backend instead of mock data
  const dashboardUser = MOCK_CURRENT_USER
  const [displayName, setDisplayName] = useState(dashboardUser.firstName)
  const [bio, setBio] = useState(dashboardUser.bio ?? '')
  const [editingName, setEditingName] = useState(false)
  const [editingBio, setEditingBio] = useState(false)

  const allPrayers = useMemo(() => getMockPrayers(), [])
  const allComments = getMockAllComments()
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(allPrayers)
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()

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
    [togglePraying, recordActivity, prayers, user],
  )

  const handleMarkAnswered = useCallback(
    (prayerId: string, praiseText: string) => {
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? {
                ...p,
                isAnswered: true,
                answeredText: praiseText || null,
                answeredAt: new Date().toISOString(),
              }
            : p,
        ),
      )
      showToast('What a testimony. God is faithful.')
    },
    [showToast],
  )

  const handleDelete = useCallback(
    (prayerId: string) => {
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId))
      showToast('Prayer removed from your list.')
    },
    [showToast],
  )

  const handleSubmitComment = useCallback(
    (prayerId: string, _content: string) => {
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? {
                ...p,
                commentCount: p.commentCount + 1,
                lastActivityAt: new Date().toISOString(),
              }
            : p,
        ),
      )
      recordActivity('prayerWall', 'prayer_wall')
      showToast('Comment shared.')
    },
    [showToast, recordActivity],
  )

  if (!isAuthenticated) {
    return <Navigate to="/login?returnTo=/prayer-wall/dashboard" replace />
  }

  const myPrayers = prayers.filter(
    (p) => p.userId === dashboardUser.id,
  )
  const myComments = allComments.filter(
    (c) => c.userId === dashboardUser.id,
  )
  const bookmarkedPrayerIds = Object.entries(reactions)
    .filter(([, r]) => r.isBookmarked)
    .map(([id]) => id)
  const bookmarkedPrayers = prayers.filter((p) =>
    bookmarkedPrayerIds.includes(p.id),
  )
  const reactedPrayerIds = Object.entries(reactions)
    .filter(([, r]) => r.isPraying)
    .map(([id]) => id)
  const reactedPrayers = prayers.filter((p) =>
    reactedPrayerIds.includes(p.id),
  )

  return (
    <PageShell>
      <SEO {...PRAYER_WALL_DASHBOARD_METADATA} />
      <main
        id="main-content"
        className="mx-auto max-w-[720px] px-4 py-6 sm:py-8"
      >
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Prayer Wall', href: '/prayer-wall' },
              { label: 'My Dashboard' },
            ]}
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
                className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-xl font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              <h1 className="text-xl font-semibold text-white">
                {displayName}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-white/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
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
                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] p-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                rows={3}
                aria-label="Bio"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-white/60">
                  {bio.length}/500
                </span>
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
              <p className="max-w-md font-serif italic text-white/70">
                {bio || 'Add a bio...'}
              </p>
              <button
                type="button"
                onClick={() => setEditingBio(true)}
                className="mt-0.5 text-text-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
                aria-label="Edit bio"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          <p className="mt-1 text-sm text-white/60">
            Joined: {formatFullDate(MOCK_CURRENT_USER.joinedDate)}
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
                'whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80',
              )}
            >
              {tab.label}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-0.5 bg-primary motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-standard"
            style={{
              width: `${100 / tabs.length}%`,
              transform: `translateX(${tabs.findIndex(t => t.key === activeTab) * 100}%)`,
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
              {myPrayers.length > 0 ? (
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
                    <CommentsSection
                      prayerId={prayer.id}
                      isOpen={openComments.has(prayer.id)}
                      comments={getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
                    />
                    {!prayer.isAnswered && (
                      <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3">
                        <MarkAsAnsweredForm
                          onConfirm={(praiseText) =>
                            handleMarkAnswered(prayer.id, praiseText)
                          }
                        />
                        <DeletePrayerDialog
                          onDelete={() => handleDelete(prayer.id)}
                        />
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
              {myComments.length > 0 ? (
                myComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                  >
                    <p className="whitespace-pre-wrap text-sm text-white/80">
                      {comment.content}
                    </p>
                    <Link
                      to={`/prayer-wall/${comment.prayerId}`}
                      className="mt-2 block text-xs text-primary hover:underline"
                    >
                      View prayer
                    </Link>
                  </div>
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
              {bookmarkedPrayers.length > 0 ? (
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
                    <CommentsSection
                      prayerId={prayer.id}
                      isOpen={openComments.has(prayer.id)}
                      comments={getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
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
                    <CommentsSection
                      prayerId={prayer.id}
                      isOpen={openComments.has(prayer.id)}
                      comments={getMockComments(prayer.id)}
                      totalCount={prayer.commentCount}
                      onSubmitComment={handleSubmitComment}
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
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-5">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Notification Preferences
              </h2>
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
                <p className="text-sm text-amber-200">
                  Notifications coming soon
                </p>
              </div>
              {NOTIFICATION_TYPES.map((type) => (
                <label
                  key={type.key}
                  className="flex items-center justify-between border-b border-white/10 py-3 last:border-0"
                >
                  <span className="text-sm text-white/70">{type.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="h-4 w-4 rounded border-white/20 text-primary accent-primary"
                  />
                </label>
              ))}
            </div>
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
