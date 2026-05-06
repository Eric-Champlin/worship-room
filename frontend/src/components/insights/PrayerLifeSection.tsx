import { HandHeart, Heart } from 'lucide-react'
import { getPrayers } from '@/services/prayer-list-storage'
import { useInsightsData } from '@/contexts/InsightsDataContext'
import { CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'

const MIN_CORRELATION_DAYS = 5
const MIN_CATEGORY_PRAYERS = 3

const CATEGORY_COLORS: Record<PrayerCategory, string> = {
  health: '#2DD4BF',
  'mental-health': '#60A5FA',
  family: '#8B5CF6',
  work: '#F59E0B',
  grief: '#D97706',
  gratitude: '#34D399',
  praise: '#EC4899',
  relationships: '#6366F1',
  other: '#6B7280',
  discussion: '#A78BFA',
}

export function PrayerLifeSection() {
  const { moodEntries } = useInsightsData()
  const prayers = getPrayers()
  if (prayers.length === 0) return null

  const activeCount = prayers.filter((p) => p.status === 'active').length
  const answeredCount = prayers.filter((p) => p.status === 'answered').length
  const totalCount = prayers.length
  const answerRate = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  // Mood correlation: match prayer lastPrayedAt dates with mood entries
  const moodByDate = new Map<string, number[]>()
  for (const entry of moodEntries) {
    const existing = moodByDate.get(entry.date)
    if (existing) {
      existing.push(entry.mood)
    } else {
      moodByDate.set(entry.date, [entry.mood])
    }
  }

  const prayerDates = new Set<string>()
  for (const prayer of prayers) {
    if (prayer.lastPrayedAt) {
      const date = prayer.lastPrayedAt.split('T')[0]
      prayerDates.add(date)
    }
  }

  let prayerMoodSum = 0
  let prayerMoodCount = 0
  for (const date of prayerDates) {
    const moods = moodByDate.get(date)
    if (moods) {
      const avg = moods.reduce((a, b) => a + b, 0) / moods.length
      prayerMoodSum += avg
      prayerMoodCount++
    }
  }

  const moodCorrelation =
    prayerMoodCount >= MIN_CORRELATION_DAYS
      ? {
          avg: prayerMoodSum / prayerMoodCount,
          dayCount: prayerMoodCount,
        }
      : null

  // Category breakdown: count per category, top 3
  const categoryCounts = new Map<PrayerCategory, number>()
  for (const prayer of prayers) {
    categoryCounts.set(prayer.category, (categoryCounts.get(prayer.category) ?? 0) + 1)
  }

  const sortedCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])

  const categoryBreakdown =
    totalCount >= MIN_CATEGORY_PRAYERS
      ? {
          topCategory: sortedCategories[0][0],
          segments: sortedCategories.map(([cat, count]) => ({
            category: cat,
            count,
            fraction: count / totalCount,
          })),
          top3: sortedCategories.slice(0, 3),
        }
      : null

  return (
    <section aria-labelledby="prayer-life-title" className="space-y-4">
      <div className="flex items-center gap-2">
        <HandHeart className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="prayer-life-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Prayer Life
        </h2>
      </div>

      {/* Stats card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div>
            <p className="text-2xl font-semibold text-white">{activeCount}</p>
            <p className="text-sm text-white/60">Active</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">{answeredCount}</p>
            <p className="text-sm text-white/60">Answered</p>
          </div>
          <div>
            <p className="text-sm text-white/60">
              {answeredCount} of {totalCount} prayers answered &mdash; {answerRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Mood correlation card */}
      {moodCorrelation && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
          <div className="flex items-start gap-3">
            <Heart
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-white">
                On days you prayed for your prayer list, your mood averaged{' '}
                <span className="font-bold text-pink-400">
                  {moodCorrelation.avg.toFixed(1)}
                </span>
              </p>
              <p className="mt-1 text-xs text-white/50">
                Based on {moodCorrelation.dayCount} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category breakdown card */}
      {categoryBreakdown && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
          <p className="mb-3 text-sm font-medium text-white">
            You pray most about{' '}
            <span className="text-primary-lt">
              {CATEGORY_LABELS[categoryBreakdown.topCategory]}
            </span>
          </p>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            {categoryBreakdown.segments.map((seg) => (
              <div
                key={seg.category}
                className="transition-all motion-reduce:transition-none"
                style={{
                  flex: seg.fraction,
                  backgroundColor: CATEGORY_COLORS[seg.category],
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {categoryBreakdown.top3.map(([cat, count]) => (
              <span key={cat} className="text-xs text-white/50">
                {CATEGORY_LABELS[cat]} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
