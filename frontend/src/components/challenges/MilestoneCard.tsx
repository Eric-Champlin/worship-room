import { useState, useEffect, useCallback } from 'react'
import { Share2 } from 'lucide-react'
import { generateChallengeShareImage } from '@/lib/challenge-share-canvas'
import { useToastSafe } from '@/components/ui/Toast'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface MilestoneCardProps {
  milestoneTitle: string
  challengeTitle: string
  challengeId: string
  themeColor: string
  currentDay: number
  totalDays: number
  streak: number
  onDismiss: () => void
}

export function MilestoneCard({
  milestoneTitle,
  challengeTitle,
  challengeId,
  themeColor,
  currentDay,
  totalDays,
  streak,
  onDismiss,
}: MilestoneCardProps) {
  const { showToast, showCelebrationToast } = useToastSafe()
  const prefersReduced = useReducedMotion()
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)

  // Generate share image on mount
  useEffect(() => {
    let cancelled = false
    generateChallengeShareImage({
      challengeTitle,
      themeColor,
      currentDay,
      totalDays,
      streak,
    }).then((blob) => {
      if (!cancelled) {
        setShareImageUrl(URL.createObjectURL(blob))
      }
    }).catch(() => {
      // Canvas generation failed — share button will still work
    })
    return () => { cancelled = true }
  }, [challengeTitle, themeColor, currentDay, totalDays, streak])

  // Fire confetti on mount (respects reduced motion)
  useEffect(() => {
    if (!prefersReduced) {
      showCelebrationToast('', milestoneTitle, 'celebration-confetti')
    }
    // Only fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl)
    }
  }, [shareImageUrl])

  const handleShare = useCallback(async () => {
    setIsSharing(true)
    try {
      const blob = await generateChallengeShareImage({
        challengeTitle,
        themeColor,
        currentDay,
        totalDays,
        streak,
      })
      const file = new File([blob], `worship-room-${challengeId}-milestone-day${currentDay}.png`, {
        type: 'image/png',
      })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${milestoneTitle} — ${challengeTitle}`,
          text: `I reached ${milestoneTitle} on ${challengeTitle}!`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `worship-room-${challengeId}-milestone-day${currentDay}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast('Image downloaded!')
      }
    } catch {
      showToast('Could not share image')
    } finally {
      setIsSharing(false)
    }
  }, [challengeTitle, challengeId, themeColor, currentDay, totalDays, streak, milestoneTitle, showToast])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md sm:p-8">
        <h2 className="font-script text-3xl sm:text-4xl" style={{ color: themeColor }}>
          {milestoneTitle}
        </h2>

        {shareImageUrl && (
          <img
            src={shareImageUrl}
            alt="Share preview"
            className="mx-auto mt-4 max-w-[240px] rounded-xl shadow-lg sm:max-w-xs"
            loading="lazy"
          />
        )}

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            style={{ backgroundColor: themeColor }}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            aria-label={`Share your ${milestoneTitle} milestone for ${challengeTitle}`}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {isSharing ? 'Sharing...' : 'Share Your Milestone'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full min-h-[44px] rounded-lg border border-white/30 px-6 py-3 text-white/80 transition-colors hover:bg-white/5 sm:w-auto"
          >
            Keep Going
          </button>
        </div>
      </div>
    </div>
  )
}
