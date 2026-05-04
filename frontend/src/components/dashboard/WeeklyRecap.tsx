import { X, BookOpen, PenLine, Brain, Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap'

export function WeeklyRecap() {
  const { isVisible, stats, userContributionPercent, hasFriends, dismiss } = useWeeklyRecap()

  if (!isVisible && hasFriends) return null
  if (!hasFriends) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <p className="text-base font-medium text-white">Faith grows stronger together</p>
        <p className="mt-1 mb-3 text-sm text-white/80">Your weekly journey, walked alongside friends</p>
        <Link
          to="/friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          Find people you walk with
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    )
  }

  const statItems = [
    { icon: BookOpen, label: `Prayed ${stats.prayers} times`, tonal: 'text-pink-300' },
    { icon: PenLine, label: `Journaled ${stats.journals} entries`, tonal: 'text-violet-300' },
    { icon: Brain, label: `Completed ${stats.meditations} meditations`, tonal: 'text-emerald-300' },
    { icon: Music, label: `Spent ${stats.worshipHours} hours in worship music`, tonal: 'text-cyan-300' },
  ]

  return (
    <div className="relative">
      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="absolute right-0 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        aria-label="Dismiss weekly recap"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <p className="mb-3 text-sm text-white/60">Last week, your friend group:</p>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {statItems.map(({ icon: Icon, label, tonal }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className={`h-4 w-4 flex-shrink-0 ${tonal}`} aria-hidden="true" />
            <span className="text-sm text-white/70">{label}</span>
          </div>
        ))}
      </div>

      {/* User contribution */}
      <p className="mt-3 text-sm font-medium text-white/80">
        You contributed {userContributionPercent}% of the group&apos;s growth!
      </p>
    </div>
  )
}
