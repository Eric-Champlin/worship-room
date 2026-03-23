import { useState, useCallback } from 'react'
import { Share2, Copy } from 'lucide-react'
import { generateChallengeShareImage } from '@/lib/challenge-share-canvas'
import { useToastSafe } from '@/components/ui/Toast'

interface ChallengeShareButtonProps {
  challengeTitle: string
  challengeId: string
  themeColor: string
  currentDay: number
  totalDays: number
  streak: number
  completedDaysCount: number
}

export function ChallengeShareButton({
  challengeTitle,
  challengeId,
  themeColor,
  currentDay,
  totalDays,
  streak,
  completedDaysCount,
}: ChallengeShareButtonProps) {
  const { showToast } = useToastSafe()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = useCallback(async () => {
    setIsGenerating(true)
    try {
      const blob = await generateChallengeShareImage({
        challengeTitle,
        themeColor,
        currentDay,
        totalDays,
        streak,
      })

      const file = new File([blob], `worship-room-${challengeId}-day${currentDay}.png`, {
        type: 'image/png',
      })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${challengeTitle} — Day ${currentDay}`,
          text: `I'm on Day ${currentDay} of ${challengeTitle} on Worship Room!`,
          files: [file],
        })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `worship-room-${challengeId}-day${currentDay}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        showToast('Image downloaded!')
      }
    } catch {
      showToast('Could not share image')
    } finally {
      setIsGenerating(false)
    }
  }, [challengeTitle, challengeId, themeColor, currentDay, totalDays, streak, showToast])

  const handleCopyText = useCallback(async () => {
    const text = `I'm on Day ${currentDay} of ${challengeTitle} on Worship Room! Join me: /challenges/${challengeId}`
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied!')
    } catch {
      showToast('Could not copy text')
    }
  }, [currentDay, challengeTitle, challengeId, showToast])

  if (completedDaysCount < 1) return null

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        onClick={handleShare}
        disabled={isGenerating}
        style={{ backgroundColor: themeColor }}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        aria-label={`Share your progress for ${challengeTitle}`}
      >
        {isGenerating ? (
          'Generating...'
        ) : (
          <>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share Progress
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleCopyText}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-white/80 transition-colors hover:bg-white/5"
        aria-label="Copy share text to clipboard"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        Copy text
      </button>
    </div>
  )
}
