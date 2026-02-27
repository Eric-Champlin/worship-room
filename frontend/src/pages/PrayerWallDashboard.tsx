import { useState, useCallback, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { Avatar } from '@/components/prayer-wall/Avatar'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { cn } from '@/lib/utils'
import { formatFullDate } from '@/lib/time'
import { useAuth } from '@/hooks/useAuth'
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
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<DashboardTab>('prayers')

  const dashboardUser = user ?? MOCK_CURRENT_USER
  const [displayName, setDisplayName] = useState(dashboardUser.firstName)
  const [bio, setBio] = useState(dashboardUser.bio ?? '')
  const [editingName, setEditingName] = useState(false)
  const [editingBio, setEditingBio] = useState(false)

  const allPrayers = useMemo(() => getMockPrayers(), [])
  const allComments = getMockAllComments()
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const [prayers, setPrayers] = useState<PrayerRequest[]>(allPrayers)
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()

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
      showToast('Prayer marked as answered.')
    },
    [showToast],
  )

  const handleDelete = useCallback(
    (prayerId: string) => {
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId))
      showToast('Prayer deleted.')
    },
    [showToast],
  )

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

  if (!isLoggedIn) {
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
            className="mt-2 text-xs text-text-light"
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
                className="rounded-lg border border-gray-200 px-3 py-1 text-xl font-semibold text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              <h1 className="text-xl font-semibold text-text-dark">
                {displayName}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-text-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
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
                className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                rows={3}
                aria-label="Bio"
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-text-light">
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
              <p className="max-w-md font-serif italic text-text-light">
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

          <p className="mt-1 text-sm text-text-light">
            Joined: {formatFullDate(MOCK_CURRENT_USER.joinedDate)}
          </p>
        </header>

        {/* Tab bar — scroll on mobile */}
        <div
          role="tablist"
          aria-label="Dashboard tabs"
          className="mb-6 flex overflow-x-auto border-b border-gray-200"
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
          id={`dashboard-tabpanel-${activeTab}`}
          aria-labelledby={`dashboard-tab-${activeTab}`}
        >
          {activeTab === 'prayers' && (
            <div className="flex flex-col gap-4">
              {myPrayers.length > 0 ? (
                myPrayers.map((prayer) => (
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
                    {!prayer.isAnswered && (
                      <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3">
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
                <p className="py-8 text-center text-sm text-text-light">
                  You haven't shared any prayer requests yet.
                </p>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="flex flex-col gap-3">
              {myComments.length > 0 ? (
                myComments.map((comment) => (
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
                  No comments yet.
                </p>
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
                  No bookmarked prayers.
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

          {activeTab === 'settings' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold text-text-dark">
                Notification Preferences
              </h2>
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  Notifications coming soon
                </p>
              </div>
              {NOTIFICATION_TYPES.map((type) => (
                <label
                  key={type.key}
                  className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0"
                >
                  <span className="text-sm text-text-dark">{type.label}</span>
                  <input
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="h-4 w-4 rounded border-gray-300 text-primary accent-primary"
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
  return (
    <ToastProvider>
      <AuthModalProvider>
        <DashboardContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
