import { useMemo, useCallback } from 'react'
import { generateMonthlyShareImage } from '@/lib/celebration-share-canvas'
import type { MonthlyShareData } from '@/lib/celebration-share-canvas'
import { MOOD_SHARE_LABELS } from '@/constants/dashboard/share-card-content'
import { ShareImageButton } from '@/components/sharing/ShareImageButton'
import type { MoodEntry } from '@/types/dashboard'

interface MonthlyShareButtonProps {
  monthName: string
  year: number
  moodEntries: MoodEntry[]
  activityCounts: Record<string, number>
  longestStreak: number
}

export function MonthlyShareButton({
  monthName,
  year,
  moodEntries,
  activityCounts,
  longestStreak,
}: MonthlyShareButtonProps) {
  const shareData = useMemo((): MonthlyShareData => {
    const moodAvg =
      moodEntries.length > 0
        ? moodEntries.reduce((sum, e) => sum + e.mood, 0) / moodEntries.length
        : 0
    const roundedMood = Math.round(moodAvg)
    const moodLabel = MOOD_SHARE_LABELS[roundedMood] ?? ''

    return {
      monthName,
      year,
      moodAvg: roundedMood,
      moodLabel,
      prayCount: activityCounts.pray ?? 0,
      journalCount: activityCounts.journal ?? 0,
      meditateCount: activityCounts.meditate ?? 0,
      listenCount: activityCounts.listen ?? 0,
      prayerWallCount: activityCounts.prayerWall ?? 0,
      bestStreak: longestStreak,
    }
  }, [monthName, year, moodEntries, activityCounts, longestStreak])

  const generateImage = useCallback(
    () => generateMonthlyShareImage(shareData),
    [shareData],
  )

  return (
    <div className="text-center">
      <ShareImageButton
        generateImage={generateImage}
        filename={`worship-room-${monthName.toLowerCase()}-${year}.png`}
        label="Share This Month"
        variant="primary"
      />
    </div>
  )
}
