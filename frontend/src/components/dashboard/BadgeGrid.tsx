import { useMemo } from 'react'
import { X, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BADGE_DEFINITIONS, BADGE_MAP } from '@/constants/dashboard/badges'
import { getBadgeIcon } from '@/constants/dashboard/badge-icons'
import { getBadgeData } from '@/services/badge-storage'
import type { BadgeDefinition, BadgeEarnedEntry } from '@/types/dashboard'

// --- Props ---

interface BadgeGridProps {
  onClose?: () => void
}

// --- Section configuration ---

const BADGE_GRID_SECTIONS = [
  {
    label: 'Streak Milestones',
    badgeIds: ['streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90', 'streak_180', 'streak_365'],
  },
  {
    label: 'Level-Up',
    badgeIds: ['level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'level_6'],
  },
  {
    label: 'Activity Milestones',
    badgeIds: ['prayer_100', 'journal_50', 'journal_100', 'meditate_25', 'listen_50'],
  },
  {
    label: 'First Steps',
    badgeIds: ['welcome', 'first_prayer', 'first_journal', 'first_meditate', 'first_listen', 'first_prayerwall', 'first_friend'],
  },
  {
    label: 'Full Worship Day',
    badgeIds: ['full_worship_day'],
  },
  {
    label: 'Community',
    badgeIds: ['friends_10', 'encourage_10', 'encourage_50'],
  },
]

// --- Date formatter ---

function formatEarnedDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return 'recently'
  }
}

// --- Badge cell ---

interface BadgeCellProps {
  badge: BadgeDefinition
  earned: BadgeEarnedEntry | undefined
}

function BadgeCell({ badge, earned }: BadgeCellProps) {
  const isEarned = !!earned
  const isRepeatable = badge.repeatable === true
  const config = getBadgeIcon(badge.id)
  const IconComponent = config.icon

  // Build aria-label
  let ariaLabel: string
  if (isEarned) {
    const datePart = `Earned ${formatEarnedDate(earned.earnedAt)}`
    if (isRepeatable && earned.count && earned.count > 1) {
      ariaLabel = `${badge.name} (x${earned.count}), ${datePart}`
    } else {
      ariaLabel = `${badge.name}, ${datePart}`
    }
  } else {
    ariaLabel = `${badge.name}, Locked, ${badge.description}`
  }

  // Build tooltip text
  let tooltipText: string
  if (isEarned) {
    if (isRepeatable && earned.count && earned.count > 1) {
      tooltipText = `${badge.name} (x${earned.count}) — last earned ${formatEarnedDate(earned.earnedAt)}`
    } else {
      tooltipText = `${badge.name} — earned ${formatEarnedDate(earned.earnedAt)}`
    }
  } else {
    tooltipText = `${badge.name} — ${badge.description}`
  }

  return (
    <button
      className="group relative flex items-center justify-center"
      aria-label={ariaLabel}
      type="button"
    >
      {/* Badge circle */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full',
          'h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20',
          isEarned ? config.bgColor : 'bg-white/5',
          !isEarned && 'opacity-40 grayscale',
        )}
        style={isEarned ? { boxShadow: `0 0 12px ${config.glowColor}` } : undefined}
      >
        <IconComponent
          className={cn(
            'h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9',
            isEarned ? config.textColor : 'text-white/40',
          )}
        />
      </div>

      {/* Lock icon overlay for locked badges */}
      {!isEarned && (
        <Lock className="absolute bottom-0 right-0 h-4 w-4 text-white/40" aria-hidden="true" />
      )}

      {/* Tooltip */}
      <div
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/15 bg-hero-mid px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {tooltipText}
      </div>
    </button>
  )
}

// --- Component ---

export function BadgeGrid({ onClose }: BadgeGridProps) {
  const badgeData = useMemo(() => {
    try {
      return getBadgeData()
    } catch {
      return { earned: {}, newlyEarned: [], activityCounts: {} }
    }
  }, [])

  // Count total badges for header
  const totalBadges = BADGE_DEFINITIONS.length
  const earnedCount = Object.keys(badgeData.earned).length

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Badge Collection
          <span className="ml-2 text-sm font-normal text-white/50">
            {earnedCount}/{totalBadges}
          </span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close badge collection"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Sections */}
      <div className="max-h-[60vh] overflow-y-auto">
        {BADGE_GRID_SECTIONS.map((section) => (
          <div key={section.label} className="mb-6 last:mb-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              {section.label}
            </p>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {section.badgeIds.map((id) => {
                const badge = BADGE_MAP[id]
                if (!badge) return null
                return (
                  <BadgeCell
                    key={id}
                    badge={badge}
                    earned={badgeData.earned[id]}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
