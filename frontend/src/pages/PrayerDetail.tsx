import { useState, useCallback, useEffect } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineNotice } from '@/components/pwa/OfflineNotice'
import { useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { SEO } from '@/components/SEO'
import { PRAYER_DETAIL_METADATA } from '@/lib/seo/routeMetadata'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageShell } from '@/components/prayer-wall/PageShell'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { PresenceIndicator } from '@/components/prayer-wall/PresenceIndicator'
import { PrayerReceipt } from '@/components/prayer-wall/PrayerReceipt'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { CommentItem } from '@/components/prayer-wall/CommentItem'
import { CommentInput } from '@/components/prayer-wall/CommentInput'
import { VerseFindsYou } from '@/components/prayer-wall/VerseFindsYou'
import { useVerseFindsYou } from '@/hooks/useVerseFindsYou'
import { useSettings } from '@/hooks/useSettings'
import { Button } from '@/components/ui/Button'
import { MarkAsAnsweredForm } from '@/components/prayer-wall/MarkAsAnsweredForm'
import { DeletePrayerDialog } from '@/components/prayer-wall/DeletePrayerDialog'
import { ReportDialog } from '@/components/prayer-wall/ReportDialog'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { SkeletonCard } from '@/components/skeletons/SkeletonCard'
import { SkeletonText } from '@/components/skeletons/SkeletonText'
import { reportPost as apiReportPost } from '@/services/api/reports-api'
import type { ReportReason } from '@/services/api/reports-api'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getBadgeData, saveBadgeData } from '@/services/badge-storage'
import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'
import { isBackendPrayerWallEnabled } from '@/lib/env'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import { ApiError } from '@/types/auth'
import { mapApiErrorToToast, AnonymousWriteAttemptError } from '@/lib/prayer-wall/apiErrors'
import type { PrayerRequest, PrayerComment } from '@/types/prayer-wall'

function PrayerDetailContent() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const authModal = useAuthModal()

  // Flag-off: synchronous lookup from mock data (preserves regression contract).
  // Flag-on: async fetch via getPostById + listComments in parallel.
  // Lazy initializers so the mock-data lookups only run once on mount.
  const [prayer, setPrayer] = useState<PrayerRequest | null>(() =>
    isBackendPrayerWallEnabled() ? null : (getMockPrayers().find((p) => p.id === id) ?? null)
  )
  const [comments, setComments] = useState<PrayerComment[]>(() =>
    isBackendPrayerWallEnabled() || !id ? [] : getMockComments(id)
  )
  const [isLoading, setIsLoading] = useState<boolean>(() => isBackendPrayerWallEnabled())
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState<{
    message: string
    severity: 'error' | 'warning' | 'info'
  } | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const [replyTo, setReplyTo] = useState('')
  // Spec 6.11b — Gate-G-CRISIS-SUPPRESSION. Surfaced from raw DTO via getPostByIdWithCrisisFlag.
  const [crisisFlag, setCrisisFlag] = useState(false)

  // Spec 6.8 — Verse-Finds-You. Comment trigger fires only on supportive
  // comments to Mental Health / Grief / Health posts AND only in the
  // commenter's own view (never the post author's). The category gate runs
  // at the trigger call site below.
  const verseFindsYou = useVerseFindsYou()
  const { updateVerseFindsYou } = useSettings()
  const [showOffRampPrompt, setShowOffRampPrompt] = useState(false)
  const surfacedVerseId = verseFindsYou.verse?.verse?.reference
    ? verseFindsYou.verse.verse.reference.toLowerCase().replace(/\s+/g, '-').replace(/:/g, '-')
    : null

  useEffect(() => {
    if (!id) return
    if (!isBackendPrayerWallEnabled()) {
      // Flag-off path is fully synchronous via the useState initializers above.
      return
    }
    let cancelled = false
    async function loadDetail() {
      setIsLoading(true)
      setNotFound(false)
      setFetchError(null)
      try {
        const [postResult, commentsResult] = await Promise.all([
          prayerWallApi.getPostByIdWithCrisisFlag(id!),
          prayerWallApi.listComments(id!, { page: 1, limit: 50 }),
        ])
        if (cancelled) return
        setPrayer(postResult.prayer)
        setCrisisFlag(postResult.crisisFlag)
        setComments(commentsResult.comments)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else if (err instanceof ApiError) {
          setFetchError(mapApiErrorToToast(err))
        } else {
          setFetchError({
            message: 'Something went wrong. Try again in a moment.',
            severity: 'error',
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadDetail()
    return () => {
      cancelled = true
    }
  }, [id, reloadTrigger])

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
      prev ? { ...prev, prayingCount: prev.prayingCount + (wasPraying ? -1 : 1) } : prev
    )
  }, [prayer, togglePraying, user])

  const handleToggleBookmark = useCallback(() => {
    if (!prayer) return
    toggleBookmark(prayer.id)
  }, [prayer, toggleBookmark])

  const handleSubmitComment = useCallback(
    async (prayerId: string, content: string, idempotencyKey?: string): Promise<boolean> => {
      if (!isBackendPrayerWallEnabled()) {
        // Flag-off: existing local-only path (mock comment list rendering).
        setPrayer((prev) =>
          prev
            ? {
                ...prev,
                commentCount: prev.commentCount + 1,
                lastActivityAt: new Date().toISOString(),
              }
            : prev
        )
        showToast('Comment shared.')
        setReplyTo('')
        return true
      }
      try {
        const newComment = await prayerWallApi.createComment(prayerId, content, idempotencyKey)
        setComments((prev) => [...prev, newComment])
        setPrayer((prev) =>
          prev
            ? {
                ...prev,
                commentCount: prev.commentCount + 1,
                lastActivityAt: new Date().toISOString(),
              }
            : prev
        )
        showToast('Comment shared.')
        setReplyTo('')
        return true
      } catch (err) {
        if (err instanceof AnonymousWriteAttemptError) {
          authModal?.openAuthModal('Sign in to comment')
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
        return false
      }
    },
    [showToast, authModal]
  )

  const handleReply = useCallback((authorName: string) => {
    setReplyTo(`@${authorName} `)
  }, [])

  /**
   * Spec 4.4 — Mark a comment helpful on a question post. PrayerDetail-scoped
   * version of the PrayerWall handler — same optimistic update + exact-state
   * rollback pattern (W15). Captures `previousHelpfulCommentId` BEFORE the
   * mutation, restores that exact value on backend failure.
   */
  const handleResolve = useCallback(
    async (commentId: string): Promise<void> => {
      if (!user) {
        authModal?.openAuthModal('Sign in to mark a comment as helpful')
        return
      }
      if (!prayer) return

      const previousHelpfulCommentId = prayer.questionResolvedCommentId

      const applyOptimistic = (newHelpfulId: string | undefined) => {
        setPrayer((prev) =>
          prev ? { ...prev, questionResolvedCommentId: newHelpfulId } : prev,
        )
        setComments((prev) =>
          prev.map((c) => ({ ...c, isHelpful: c.id === newHelpfulId })),
        )
      }
      applyOptimistic(commentId)

      if (!isBackendPrayerWallEnabled()) {
        return
      }

      try {
        await prayerWallApi.resolveQuestion(prayer.id, commentId)
      } catch (err) {
        applyOptimistic(previousHelpfulCommentId)
        // Mirror PrayerWall.tsx — token expiry between the upfront `if (!user)`
        // check and the PATCH would otherwise fall through to the generic toast,
        // hiding the real (recoverable) failure mode.
        if (err instanceof AnonymousWriteAttemptError) {
          authModal?.openAuthModal('Sign in to mark a comment as helpful')
        } else if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        } else {
          showToast('Could not mark as helpful. Try again.')
        }
      }
    },
    [user, prayer, authModal, showToast],
  )

  const handleMarkAnswered = useCallback(
    async (praiseText: string) => {
      if (!isBackendPrayerWallEnabled()) {
        setPrayer((prev) =>
          prev
            ? {
                ...prev,
                isAnswered: true,
                answeredText: praiseText || null,
                answeredAt: new Date().toISOString(),
              }
            : prev
        )
        showToast('What a testimony. God is faithful.')
        return
      }
      if (!prayer) return
      try {
        const updated = await prayerWallApi.updatePost(prayer.id, {
          isAnswered: true,
          answeredText: praiseText || undefined,
        })
        setPrayer(updated)
        showToast('What a testimony. God is faithful.')
      } catch (err) {
        if (err instanceof ApiError) {
          const descriptor = mapApiErrorToToast(err)
          if (descriptor.message) showToast(descriptor.message)
        }
      }
    },
    [showToast, prayer]
  )

  const handleDelete = useCallback(async () => {
    if (!isBackendPrayerWallEnabled()) {
      showToast('Prayer removed from your list.')
      return
    }
    if (!prayer) return
    try {
      await prayerWallApi.deletePost(prayer.id)
      showToast('Prayer removed from your list.')
    } catch (err) {
      if (err instanceof ApiError) {
        const descriptor = mapApiErrorToToast(err)
        if (descriptor.message) showToast(descriptor.message)
      }
    }
  }, [showToast, prayer])

  if (isLoading) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6" aria-busy="true">
          <span className="sr-only">Loading</span>
          <div className="mb-6">
            <Breadcrumb
              items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'Prayer Request' }]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <SkeletonCard>
            <SkeletonText lines={4} />
          </SkeletonCard>
        </main>
      </PageShell>
    )
  }

  if (fetchError) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6">
          <div className="mb-6">
            <Breadcrumb
              items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'Prayer Request' }]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <FeatureEmptyState
            icon={AlertCircle}
            heading="We couldn't load this prayer"
            description={fetchError.message}
            ctaLabel="Try again"
            onCtaClick={() => {
              setFetchError(null)
              setReloadTrigger((n) => n + 1)
            }}
          />
        </main>
      </PageShell>
    )
  }

  if (notFound || !prayer) {
    return (
      <PageShell>
        <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6">
          <div className="mb-6">
            <Breadcrumb
              items={[{ label: 'Prayer Wall', href: '/prayer-wall' }, { label: 'Prayer Request' }]}
              maxWidth="max-w-[720px]"
            />
          </div>
          <FeatureEmptyState
            icon={AlertCircle}
            heading="Prayer not found"
            description="This prayer request may have been removed or the link is invalid."
          />
        </main>
      </PageShell>
    )
  }

  const isOwner = user?.id === prayer.userId

  return (
    <PageShell>
      <SEO {...PRAYER_DETAIL_METADATA} />
      <main id="main-content" className="mx-auto max-w-[720px] px-4 pt-28 pb-6 sm:pb-8">
        <h1 className="sr-only">Prayer Detail</h1>
        <div className="mb-6 flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4" data-testid="feed-header">
          <Breadcrumb
            items={[
              { label: 'Prayer Wall', href: '/prayer-wall' },
              {
                label:
                  prayer.content.length > 40
                    ? prayer.content.slice(0, 40).trim() + '\u2026'
                    : prayer.content,
              },
            ]}
            maxWidth="max-w-[720px]"
          />
          {/* Spec 6.11b \u2014 Live Presence indicator. Suppressed when this single post is crisis-flagged. */}
          <PresenceIndicator suppressed={crisisFlag} />
        </div>

        <PrayerCard prayer={prayer} showFull tier="detail">
          {/* Spec 6.1 — Prayer Receipt above InteractionBar. Internally gates;
              non-authors / hidden-at-zero / setting-off cases all return null. */}
          {prayer.userId && (
            <PrayerReceipt
              postId={prayer.id}
              postAuthorId={prayer.userId}
              prayingCount={prayer.prayingCount ?? 0}
              postExcerpt={prayer.content}
            />
          )}
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

          {/* All comments — no limit. Spec 4.6: hidden entirely for encouragement (W7/D13). */}
          {prayer.postType !== 'encouragement' && (
            <div className="mt-3 border-t border-white/10 pt-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postType={prayer.postType}
                    postAuthorId={prayer.userId}
                    onReply={handleReply}
                    onResolve={handleResolve}
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
                onCommentSucceeded={() => {
                  // Spec 6.8 — comment trigger is gated on:
                  //   1. Parent post category in {health, mental-health, grief}
                  //   2. Commenter is NOT the post author (encouraging someone else,
                  //      not commenting on own post — would be weird).
                  // Per Gate-G-NO-TEXT-FLOW: pass only category, NEVER comment text.
                  const categoryEligible =
                    prayer.category === 'health' ||
                    prayer.category === 'mental-health' ||
                    prayer.category === 'grief'
                  const commenterIsAuthor = user?.id === prayer.userId
                  if (categoryEligible && !commenterIsAuthor) {
                    void verseFindsYou.trigger('comment', prayer.category ?? undefined)
                  }
                }}
              />

              {/* Spec 6.8 — Verse-Finds-You card (commenter's view only by
                  construction — verse renders client-side from this user's
                  API response, no broadcast). */}
              {verseFindsYou.verse?.verse && surfacedVerseId && (
                <div className="mt-4">
                  <VerseFindsYou
                    verse={verseFindsYou.verse.verse}
                    trigger="comment"
                    verseId={surfacedVerseId}
                    saved={verseFindsYou.wasSaved(surfacedVerseId)}
                    onDismiss={() => {
                      const result = verseFindsYou.dismiss()
                      if (result.showOffRampPrompt) setShowOffRampPrompt(true)
                    }}
                    onSaved={() => verseFindsYou.markSaved(surfacedVerseId)}
                  />
                </div>
              )}

              {/* Spec 6.8 — 3-in-a-row off-ramp prompt. */}
              {showOffRampPrompt && (
                <div
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby="prayer-detail-off-ramp-heading"
                  className="mt-4 rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4"
                >
                  <p id="prayer-detail-off-ramp-heading" className="text-white/80">
                    Want to turn this off? You can turn it back on anytime in settings.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateVerseFindsYou({ enabled: false })
                        verseFindsYou.acknowledgePromptShown()
                        setShowOffRampPrompt(false)
                      }}
                    >
                      Turn off
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        verseFindsYou.acknowledgePromptShown()
                        setShowOffRampPrompt(false)
                      }}
                    >
                      Keep it on
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report link — hidden on own posts (Spec 3.8 D11 + Watch-For #18). */}
          {!isOwner && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <ReportDialog
                prayerId={prayer.id}
                onReport={async (prayerId: string, reason: ReportReason, details?: string) => {
                  await apiReportPost(prayerId, reason, details)
                }}
              />
            </div>
          )}
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
