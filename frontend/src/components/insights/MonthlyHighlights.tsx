import { Flame, Award, Sparkles } from 'lucide-react'
import { BADGE_MAP } from '@/constants/dashboard/badges'

interface MonthlyHighlightsProps {
  longestStreak: number
  badgesEarned: string[]
  bestDay: { formattedDate: string; activityCount: number; mood: string } | null
}

export function MonthlyHighlights({
  longestStreak,
  badgesEarned,
  bestDay,
}: MonthlyHighlightsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Longest Streak */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <Flame className="mb-2 h-6 w-6 text-orange-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white/60">Longest Streak</h3>
        {longestStreak > 0 ? (
          <>
            <p className="mt-1 text-2xl font-bold text-white">
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="mt-1 text-sm text-white/60">
              Longest streak this month
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            Every day is a new beginning
          </p>
        )}
      </div>

      {/* Badges Earned */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <Award className="mb-2 h-6 w-6 text-purple-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white/60">Badges Earned</h3>
        {badgesEarned.length > 0 ? (
          <>
            <p className="mt-1 text-2xl font-bold text-white">
              {badgesEarned.length}{' '}
              {badgesEarned.length === 1 ? 'badge' : 'badges'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {badgesEarned.map((id) => {
                const badge = BADGE_MAP[id]
                return (
                  <span
                    key={id}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                  >
                    {badge?.name ?? id}
                  </span>
                )
              })}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            No new badges this month — keep going!
          </p>
        )}
      </div>

      {/* Best Day */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
        <Sparkles className="mb-2 h-6 w-6 text-teal-400" aria-hidden="true" />
        <h3 className="text-sm font-medium text-white/60">Best Day</h3>
        {bestDay ? (
          <>
            <p className="mt-1 text-2xl font-bold text-white">
              {bestDay.formattedDate}
            </p>
            <p className="mt-1 text-sm text-white/60">
              {bestDay.activityCount} activities, feeling {bestDay.mood}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-white/60">
            No data yet — start checking in to see your journey!
          </p>
        )}
      </div>
    </div>
  )
}
