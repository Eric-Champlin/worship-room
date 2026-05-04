import { X, BookOpen, PenLine, Brain, Music } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap'

export function WeeklyRecap() {
  const { isVisible, stats, userContributionPercent, hasFriends, dismiss } = useWeeklyRecap()

  if (!isVisible && hasFriends) return null
  if (!hasFriends) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <p className="mb-3 text-sm text-white/50">Add friends to see your weekly recap</p>
        <Link
          to="/friends"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Find friends
        </Link>
      </div>
    )
  }

  const statItems = [
    { icon: BookOpen, label: `Prayed ${stats.prayers} times` },
    { icon: PenLine, label: `Journaled ${stats.journals} entries` },
    { icon: Brain, label: `Completed ${stats.meditations} meditations` },
    { icon: Music, label: `Spent ${stats.worshipHours} hours in worship music` },
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
        {statItems.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="h-4 w-4 flex-shrink-0 text-white/40" aria-hidden="true" />
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
