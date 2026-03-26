import { useMemo } from 'react'
import { Heart } from 'lucide-react'
import { getGratitudeEntries } from '@/services/gratitude-storage'
import { getMoodEntries } from '@/services/mood-storage'

const MIN_QUALIFYING_DAYS = 5

export function GratitudeCorrelationCard() {
  const data = useMemo(() => {
    const gratitudeEntries = getGratitudeEntries()
    const moodEntries = getMoodEntries()

    if (gratitudeEntries.length === 0 || moodEntries.length === 0) return null

    // Build date → mood values map (average if multiple entries per date)
    const moodByDate = new Map<string, number[]>()
    for (const entry of moodEntries) {
      const existing = moodByDate.get(entry.date)
      if (existing) {
        existing.push(entry.mood)
      } else {
        moodByDate.set(entry.date, [entry.mood])
      }
    }

    // Build set of gratitude dates
    const gratitudeDates = new Set(gratitudeEntries.map((e) => e.date))

    // Find days with BOTH gratitude + mood
    let gratitudeMoodSum = 0
    let gratitudeMoodCount = 0
    let nonGratitudeMoodSum = 0
    let nonGratitudeMoodCount = 0

    for (const [date, moods] of moodByDate) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length
      if (gratitudeDates.has(date)) {
        gratitudeMoodSum += avg
        gratitudeMoodCount++
      } else {
        nonGratitudeMoodSum += avg
        nonGratitudeMoodCount++
      }
    }

    if (gratitudeMoodCount < MIN_QUALIFYING_DAYS) return null

    const gratitudeDayAvg = gratitudeMoodSum / gratitudeMoodCount
    const nonGratitudeDayAvg =
      nonGratitudeMoodCount > 0 ? nonGratitudeMoodSum / nonGratitudeMoodCount : 0

    const encouragingText =
      gratitudeDayAvg > nonGratitudeDayAvg
        ? 'Gratitude seems to lift your spirits! Keep counting your blessings.'
        : 'Every act of gratitude matters, even when it doesn\u2019t feel like it.'

    return {
      gratitudeDayAvg,
      qualifyingDayCount: gratitudeMoodCount,
      encouragingText,
    }
  }, [])

  if (!data) return null

  return (
    <section
      aria-label="Gratitude and mood correlation"
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
    >
      <div className="flex items-start gap-3">
        <Heart className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-white">
            On days you practiced gratitude, your mood averaged{' '}
            <span className="font-bold text-pink-400">{data.gratitudeDayAvg.toFixed(1)}</span>
          </p>
          <p className="mt-1 text-xs text-white/50">
            Based on {data.qualifyingDayCount} days of data
          </p>
          <p className="mt-2 text-xs italic text-white/60">
            {data.encouragingText}
          </p>
        </div>
      </div>
    </section>
  )
}
