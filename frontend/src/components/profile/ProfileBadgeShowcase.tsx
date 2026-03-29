import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BADGE_DEFINITIONS } from '@/constants/dashboard/badges'
import { getBadgeIcon } from '@/constants/dashboard/badge-icons'
import type { BadgeData, BadgeDefinition, BadgeEarnedEntry } from '@/types/dashboard'

interface ProfileBadgeShowcaseProps {
  badgeData: BadgeData
  isOwnProfile: boolean
}

function formatEarnedDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (_e) {
    // localStorage may be unavailable
    return 'recently'
  }
}

export function ProfileBadgeShowcase({ badgeData, isOwnProfile }: ProfileBadgeShowcaseProps) {
  const earnedCount = Object.keys(badgeData.earned).length
  const totalCount = BADGE_DEFINITIONS.length

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-white">
        Badges ({earnedCount}/{totalCount})
      </h2>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
        {BADGE_DEFINITIONS.map((badge) => (
          <BadgeCell
            key={badge.id}
            badge={badge}
            earned={badgeData.earned[badge.id]}
            isOwnProfile={isOwnProfile}
          />
        ))}
      </div>
    </div>
  )
}

interface BadgeCellProps {
  badge: BadgeDefinition
  earned: BadgeEarnedEntry | undefined
  isOwnProfile: boolean
}

function BadgeCell({ badge, earned, isOwnProfile }: BadgeCellProps) {
  const isEarned = !!earned
  const config = getBadgeIcon(badge.id)
  const IconComponent = config.icon

  // Tooltip text
  let tooltipText: string
  if (isEarned) {
    const isRepeatable = badge.repeatable === true
    if (isRepeatable && earned.count && earned.count > 1) {
      tooltipText = `${badge.name} (x${earned.count}) — ${formatEarnedDate(earned.earnedAt)}`
    } else {
      tooltipText = `${badge.name} — ${formatEarnedDate(earned.earnedAt)}`
    }
  } else {
    tooltipText = `${badge.name} — ${badge.description}`
  }

  // Aria label
  let ariaLabel: string
  if (isEarned) {
    ariaLabel = `${badge.name}, earned ${formatEarnedDate(earned.earnedAt)}`
  } else {
    ariaLabel = `${badge.name}, locked, ${badge.description}`
  }

  // Glow — own profile earned badges get extra glow
  const glowShadow = isEarned
    ? isOwnProfile
      ? `0 0 16px ${config.glowColor}`
      : `0 0 12px ${config.glowColor}`
    : undefined

  return (
    <button
      className="group relative flex items-center justify-center motion-safe:hover:scale-105 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
      aria-label={ariaLabel}
      type="button"
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14',
          isEarned ? config.bgColor : 'bg-white/5',
          !isEarned && 'opacity-40 grayscale',
        )}
        style={glowShadow ? { boxShadow: glowShadow } : undefined}
      >
        <IconComponent
          className={cn(
            'h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7',
            isEarned ? config.textColor : 'text-white/40',
          )}
        />
      </div>

      {/* Lock overlay for locked */}
      {!isEarned && (
        <Lock className="absolute bottom-0 right-0 h-3 w-3 text-white/40" aria-hidden="true" />
      )}

      {/* Tooltip */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-hero-mid px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {tooltipText}
      </div>
    </button>
  )
}
