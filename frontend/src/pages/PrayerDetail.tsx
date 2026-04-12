import { useState, useCallback } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { useParams } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { PRAYER_DETAIL_METADATA } from '@/lib/seo/routeMetadata'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentItem } from '@/components/prayer-wall/CommentItem'
import { CommentInput } from '@/components/prayer-wall/CommentInput'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { ReportDialog } from '@/components/prayer-wall/ReportDialog'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'
import type { PrayerRequest } from '@/types/prayer-wall'

function PrayerDetailContent() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const authModal = useAuthModal()

  const allPrayers = getMockPrayers()
  const initialPrayer = allPrayers.find((p) => p.id === id)

  const [prayer, setPrayer] = useState<PrayerRequest | null>(initialPrayer ?? null)
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const [replyTo, setReplyTo] = useState('')

  const comments = id ? getMockComments(id) : []

  const handleTogglePraying = useCallback(() => {
    if (!prayer) return
    const wasPraying = togglePraying(prayer.id)
    if (!wasPraying) {
      // Only count as intercession if not praying for own prayer
      if (prayer.userId !== user?.id) {
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
    setPrayer((prev) =>
      prev ? { ...prev, prayingCount: prev.prayingCount + (wasPraying ? -1 : 1) } : prev,
    )
  }, [prayer, togglePraying, user])

  const handleToggleBookmark = useCallback(() => {
    if (!prayer) return
    toggleBookmark(prayer.id)
  }, [prayer, toggleBookmark])

  const handleSubmitComment = useCallback(
    (_prayerId: string, _content: string) => {
      setPrayer((prev) =>
        prev
          ? {
              ...prev,
              commentCount: prev.commentCount + 1,
              lastActivityAt: new Date().toISOString(),
            }
          : prev,
      )
      showToast('Comment shared.')
      setReplyTo('')
    },
    [showToast],
  )

  const handleReply = useCallback((authorName: string) => {
    setReplyTo(`@${authorName} `)
  }, [])

  const handleMarkAnswered = useCallback(
    (praiseText: string) => {
      setPrayer((prev) =>
        prev
          ? {
              ...prev,
              isAnswered: true,
              answeredText: praiseText || null,
              answeredAt: new Date().toISOString(),
            }
          : prev,
      )
      showToast('What a testimony. God is faithful.')
    },
    [showToast],
  )

  const handleDelete = useCallback(() => {
    showToast('Prayer removed from your list.')
  }, [showToast])

  if (!prayer) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 py-6">
          <div className="mb-6">
            <Breadcrumb
              items={[
                { label: 'Prayer Wall', href: '/prayer-wall' },
                { label: 'Prayer Request' },
              ]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-8 text-center">
            <p className="text-lg font-semibold text-white">
              Prayer not found
            </p>
            <p className="mt-2 text-sm text-white/60">
              This prayer request may have been removed or the link is invalid.
            </p>
          </div>
        </main>
      </PageShell>
    )
  }

  const isOwner = user?.id === prayer.userId

  return (
    <PageShell>
      <SEO {...PRAYER_DETAIL_METADATA} />
      <main
        id="main-content"
        className="mx-auto max-w-[720px] px-4 py-6 sm:py-8"
      >
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Prayer Wall', href: '/prayer-wall' },
              { label: prayer.content.length > 40 ? prayer.content.slice(0, 40).trim() + '\u2026' : prayer.content },
            ]}
            maxWidth="max-w-[720px]"
          />
        </div>

        <PrayerCard prayer={prayer} showFull>
          <InteractionBar
            prayer={prayer}
            reactions={reactions[prayer.id]}
            onTogglePraying={handleTogglePraying}
            onToggleComments={() => {}}
            onToggleBookmark={handleToggleBookmark}
            isCommentsOpen={true}
          />

          {/* Owner actions */}
          {isOwner && !prayer.isAnswered && (
            <div className="mt-3 flex items-center gap-4 border-t border-white/10 pt-3">
              <MarkAsAnsweredForm onConfirm={handleMarkAnswered} />
              <DeletePrayerDialog onDelete={handleDelete} />
            </div>
          )}

          {/* All comments — no limit */}
          <div className="mt-3 border-t border-white/10 pt-3">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                />
              ))
            ) : (
              <p className="py-2 text-sm text-white/50">
                No comments yet. Be the first to encourage.
              </p>
            )}

            <CommentInput
              prayerId={prayer.id}
              onSubmit={handleSubmitComment}
              initialValue={replyTo}
              onLoginClick={() => authModal?.openAuthModal()}
            />
          </div>

          {/* Report link */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <ReportDialog prayerId={prayer.id} />
          </div>
        </PrayerCard>
      </main>
    </PageShell>
  )
}

export function PrayerDetail() {
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

  return <PrayerDetailContent />
}
