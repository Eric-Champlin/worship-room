import { useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentItem } from '@/components/prayer-wall/CommentItem'
import { CommentInput } from '@/components/prayer-wall/CommentInput'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { ReportDialog } from '@/components/prayer-wall/ReportDialog'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { AuthModalProvider, useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
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
    setPrayer((prev) =>
      prev ? { ...prev, prayingCount: prev.prayingCount + (wasPraying ? -1 : 1) } : prev,
    )
  }, [prayer, togglePraying])

  const handleToggleBookmark = useCallback(() => {
    if (!prayer) return
    toggleBookmark(prayer.id)
  }, [prayer, toggleBookmark])

  const handleSubmitComment = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      showToast('Comment posted.')
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
      showToast('Prayer marked as answered.')
    },
    [showToast],
  )

  const handleDelete = useCallback(() => {
    showToast('Prayer deleted.')
  }, [showToast])

  if (!prayer) {
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
              Prayer not found
            </p>
            <p className="mt-2 text-sm text-text-light">
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
            <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3">
              <MarkAsAnsweredForm onConfirm={handleMarkAnswered} />
              <DeletePrayerDialog onDelete={handleDelete} />
            </div>
          )}

          {/* All comments — no limit */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                />
              ))
            ) : (
              <p className="py-2 text-sm text-text-light">
                No comments yet. Be the first to encourage.
              </p>
            )}

            <CommentInput
              prayerId={prayer.id}
              onSubmit={handleSubmitComment}
              initialValue={replyTo}
              onLoginClick={authModal?.openAuthModal}
            />
          </div>

          {/* Report link */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <ReportDialog prayerId={prayer.id} />
          </div>
        </PrayerCard>
      </main>
    </PageShell>
  )
}

export function PrayerDetail() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <PrayerDetailContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
