import { useState, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
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
import type { PrayerRequest } from '@/types/prayer-wall'

type ProfileTab = 'prayers' | 'replies' | 'reactions'

const tabs: { key: ProfileTab; label: string }[] = [
  { key: 'prayers', label: 'Prayers' },
  { key: 'replies', label: 'Replies' },
  { key: 'reactions', label: 'Reactions' },
]

function PrayerWallProfileContent() {
  const { id } = useParams<{ id: string }>()
  const profileUser = id ? getMockUser(id) : undefined
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
    [togglePraying, allPrayers, currentUser],
  )

  const allComments = getMockAllComments()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(allPrayers)

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
      showToast('Comment shared.')
    },
    [showToast],
  )

  if (!profileUser) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: 'Prayer Wall', href: '/prayer-wall' },
                { label: 'User Profile' },
              ]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-8 text-center">
            <p className="text-lg font-semibold text-white">
              User not found
            </p>
            <p className="mt-2 text-sm text-white/60">
              This profile doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </PageShell>
    )
  }

  const userPrayers = prayers.filter(
    (p) => p.userId === id && !p.isAnonymous,
  )
  const userComments = allComments.filter((c) => c.userId === id)
  // Reactions are private per-user data — only show for the profile owner.
  // In mock mode we have no per-user reaction data, so this tab is always empty.
  const reactedPrayers: typeof allPrayers = []

  return (
    <PageShell>
      <SEO
        title={`${profileUser.firstName}'s Prayers`}
        description={`Prayers shared by ${profileUser.firstName} on the Worship Room community prayer wall.`}
      />
      <main
        id="main-content"
        className="mx-auto max-w-[720px] px-4 py-6 sm:py-8"
      >
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Prayer Wall', href: '/prayer-wall' },
              { label: `${profileUser.firstName}'s Profile` },
            ]}
            maxWidth="max-w-[720px]"
          />
        </div>

        {/* Profile header */}
        <header className="mb-6 flex flex-col items-center text-center">
          <Avatar
            firstName={profileUser.firstName}
            lastName={profileUser.lastName}
            avatarUrl={profileUser.avatarUrl}
            size="lg"
            userId={profileUser.id}
            alt={`${profileUser.firstName}'s profile photo`}
          />
          <h1 className="mt-3 text-xl font-semibold text-white">
            {profileUser.firstName}
          </h1>
          {profileUser.bio && (
            <p className="mt-2 max-w-md font-serif italic text-white/70">
              {profileUser.bio}
            </p>
          )}
          <p className="mt-1 text-sm text-white/60">
            Joined: {formatFullDate(profileUser.joinedDate)}
          </p>
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
                'px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-white/60 hover:text-white/80',
              )}
            >
              {tab.label}
            </button>
          ))}
          <div
            className="absolute bottom-0 h-0.5 bg-primary motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-in-out"
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
          id={`profile-tabpanel-${activeTab}`}
          aria-labelledby={`profile-tab-${activeTab}`}
          className="motion-safe:animate-tab-fade-in"
          key={activeTab}
        >
          {activeTab === 'prayers' && (
            <div className="flex flex-col gap-4">
              {userPrayers.length > 0 ? (
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
                <p className="py-8 text-center text-sm text-white/50">
                  No prayers shared yet.
                </p>
              )}
            </div>
          )}

          {activeTab === 'replies' && (
            <div className="flex flex-col gap-3">
              {userComments.length > 0 ? (
                userComments.map((comment) => (
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
                <p className="py-8 text-center text-sm text-white/50">
                  No replies yet.
                </p>
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
                <p className="py-8 text-center text-sm text-white/50">
                  No reactions yet.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </PageShell>
  )
}

export function PrayerWallProfile() {
  return <PrayerWallProfileContent />
}
