import { useState, useCallback, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { cn } from '@/lib/utils'
import { formatFullDate } from '@/lib/time'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
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
  const user = id ? getMockUser(id) : undefined
  const [activeTab, setActiveTab] = useState<ProfileTab>('prayers')
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const { showToast } = useToast()
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()

  const allPrayers = useMemo(() => getMockPrayers(), [])
  const allComments = getMockAllComments()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(allPrayers)

  const handleSubmitComment = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      showToast('Comment posted.')
    },
    [showToast],
  )

  if (!user) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6">
          <Link
            to="/prayer-wall"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Prayer Wall
          </Link>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-lg font-semibold text-text-dark">
              User not found
            </p>
            <p className="mt-2 text-sm text-text-light">
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
      <main
        id="main-content"
        className="mx-auto max-w-[720px] px-4 py-6 sm:py-8"
      >
        <Link
          to="/prayer-wall"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Prayer Wall
        </Link>

        {/* Profile header */}
        <header className="mb-6 flex flex-col items-center text-center">
          <Avatar
            firstName={user.firstName}
            lastName={user.lastName}
            avatarUrl={user.avatarUrl}
            size="lg"
            userId={user.id}
            alt={`${user.firstName}'s profile photo`}
          />
          <h1 className="mt-3 text-xl font-semibold text-text-dark">
            {user.firstName}
          </h1>
          {user.bio && (
            <p className="mt-2 max-w-md font-serif italic text-text-light">
              {user.bio}
            </p>
          )}
          <p className="mt-1 text-sm text-text-light">
            Joined: {formatFullDate(user.joinedDate)}
          </p>
        </header>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Profile tabs"
          className="mb-6 flex border-b border-gray-200"
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
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-text-light hover:text-text-dark',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div
          role="tabpanel"
          id={`profile-tabpanel-${activeTab}`}
          aria-labelledby={`profile-tab-${activeTab}`}
        >
          {activeTab === 'prayers' && (
            <div className="flex flex-col gap-4">
              {userPrayers.length > 0 ? (
                userPrayers.map((prayer) => (
                  <PrayerCard key={prayer.id} prayer={prayer}>
                    <InteractionBar
                      prayer={prayer}
                      reactions={reactions[prayer.id]}
                      onTogglePraying={() => togglePraying(prayer.id)}
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
                <p className="py-8 text-center text-sm text-text-light">
                  No prayer requests yet.
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
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <p className="whitespace-pre-wrap text-sm text-text-dark">
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
                <p className="py-8 text-center text-sm text-text-light">
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
                      onTogglePraying={() => togglePraying(prayer.id)}
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
                <p className="py-8 text-center text-sm text-text-light">
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
  return (
    <ToastProvider>
      <AuthModalProvider>
        <PrayerWallProfileContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
