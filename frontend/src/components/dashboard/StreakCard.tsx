import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { LEVEL_THRESHOLDS } from '@/constants/dashboard/levels'
import { BADGE_MAP } from '@/constants/dashboard/badges'
import { getBadgeIcon } from '@/constants/dashboard/badge-icons'
import { AnimatedCounter } from './AnimatedCounter'
import { BadgeGrid } from './BadgeGrid'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  totalPoints: number
  currentLevel: number
  levelName: string
  pointsToNextLevel: number
  todayMultiplier: number
  animate?: boolean
}

const LEVEL_ICONS_MAP: Record<number, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  1: getBadgeIcon('level_1').icon,
  2: getBadgeIcon('level_2').icon,
  3: getBadgeIcon('level_3').icon,
  4: getBadgeIcon('level_4').icon,
  5: getBadgeIcon('level_5').icon,
  6: getBadgeIcon('level_6').icon,
}

function getNextLevelInfo(currentLevel: number) {
  const next = LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1)
  if (!next) return null
  return { threshold: next.threshold, name: next.name }
}

function getRecentBadges(): { id: string; name: string; earnedAt: string }[] {
  try {
    const raw = localStorage.getItem('wr_badges')
    if (!raw) return []
    const data = JSON.parse(raw)
    const earned = data?.earned
    if (!earned || typeof earned !== 'object' || Array.isArray(earned)) return []

    return Object.entries(earned)
      .filter(([, entry]: [string, unknown]) => (entry as { earnedAt?: string })?.earnedAt)
      .map(([id, entry]: [string, unknown]) => ({
        id,
        name: BADGE_MAP[id]?.name ?? id,
        earnedAt: (entry as { earnedAt: string }).earnedAt,
      }))
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
      .slice(0, 3)
  } catch {
    return []
  }
}

export function StreakCard({
  currentStreak,
  longestStreak,
  totalPoints,
  currentLevel,
  levelName,
  pointsToNextLevel,
  todayMultiplier,
  animate = false,
}: StreakCardProps) {
  const [showBadgeGrid, setShowBadgeGrid] = useState(false)

  // Track previous points for live animation (not initial render, not during entry animate)
  const prevPointsRef = useRef(totalPoints)
  const isInitialRender = useRef(true)
  const [liveFrom, setLiveFrom] = useState<number | null>(null)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      prevPointsRef.current = totalPoints
      return
    }
    if (animate) {
      // Entry animation handles this case
      prevPointsRef.current = totalPoints
      return
    }
    if (totalPoints !== prevPointsRef.current) {
      setLiveFrom(prevPointsRef.current)
      prevPointsRef.current = totalPoints
    }
  }, [totalPoints, animate])

  const LevelIcon = LEVEL_ICONS_MAP[currentLevel] ?? getBadgeIcon('level_1').icon
  const nextLevel = getNextLevelInfo(currentLevel)
  const isMaxLevel = pointsToNextLevel === 0
  const currentThreshold =
    LEVEL_THRESHOLDS.find((l) => l.level === currentLevel)?.threshold ?? 0
  const nextThreshold = nextLevel?.threshold ?? currentThreshold

  const progressPercent = isMaxLevel
    ? 100
    : nextThreshold > currentThreshold
      ? ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100
      : 100

  const recentBadges = getRecentBadges()

  // Streak encouragement messages
  function getStreakMessage(): string | null {
    if (currentStreak === 0) return 'A new streak starts today'
    if (currentStreak === 1 && longestStreak <= 1) return 'Every journey begins with a single step'
    if (currentStreak === 1 && longestStreak > 1) return 'Every day is a new beginning. Start fresh today.'
    return null
  }

  const streakMessage = getStreakMessage()

  return (
    <div className="space-y-4">
      {/* Badge Grid Overlay */}
      {showBadgeGrid && (
        <div className="mb-4">
          <BadgeGrid onClose={() => setShowBadgeGrid(false)} />
        </div>
      )}

      {/* Streak display */}
      <div>
        {currentStreak > 0 ? (
          <div className="flex items-center gap-2">
            <Flame
              className="h-8 w-8 text-amber-400 md:h-9 md:w-9"
              aria-hidden="true"
            />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-3xl font-bold text-white md:text-4xl ${animate && currentStreak === 1 ? 'motion-safe:animate-streak-bump' : ''}`}>
                  {animate ? (
                    <AnimatedCounter from={0} to={currentStreak} duration={800} />
                  ) : (
                    currentStreak
                  )}
                </span>
                <span className="text-sm text-white/60">
                  {currentStreak === 1 ? 'day streak' : 'days streak'}
                </span>
              </div>
              <p className="text-xs text-white/50">
                Longest: {longestStreak} days
              </p>
              {streakMessage && (
                <p className="mt-1 text-sm text-white/60">
                  {streakMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Flame
              className="h-8 w-8 text-white/30 md:h-9 md:w-9"
              aria-hidden="true"
            />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white md:text-4xl">
                  0
                </span>
                <span className="text-sm text-white/60">day streak</span>
              </div>
              <p className="text-xs text-white/50">
                Longest: {longestStreak} days
              </p>
              {streakMessage && (
                <p className="mt-1 text-sm text-white/60">
                  {streakMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Faith Points & Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">
            {animate ? (
              <><AnimatedCounter from={0} to={totalPoints} duration={600} /> Faith Points</>
            ) : liveFrom !== null ? (
              <><AnimatedCounter from={liveFrom} to={totalPoints} duration={600} key={totalPoints} /> Faith Points</>
            ) : (
              <>{totalPoints.toLocaleString()} Faith Points</>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <LevelIcon className="h-5 w-5 text-primary-lt" aria-hidden="true" />
            <span className="text-sm text-white/70">{levelName}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={totalPoints}
          aria-valuemin={isMaxLevel ? 10000 : currentThreshold}
          aria-valuemax={isMaxLevel ? 10000 : nextThreshold}
          aria-label={
            isMaxLevel
              ? 'Maximum level reached — Lighthouse'
              : `Faith points progress toward ${nextLevel?.name}`
          }
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>

        <p className="text-xs text-white/50">
          {isMaxLevel
            ? 'Lighthouse — Max Level'
            : `${totalPoints} / ${nextThreshold} to ${nextLevel?.name}`}
        </p>
      </div>

      {/* Multiplier & Recent Badges */}
      {(todayMultiplier > 1 || recentBadges.length > 0) && (
        <div className="flex items-center justify-between">
          {todayMultiplier > 1 && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
              {todayMultiplier}x bonus today!
            </span>
          )}
          {recentBadges.length > 0 && (
            <div className="flex items-center gap-1.5">
              {recentBadges.map((badge) => {
                const iconConfig = getBadgeIcon(badge.id)
                const BadgeIcon = iconConfig.icon
                return (
                  <button
                    key={badge.id}
                    onClick={() => setShowBadgeGrid(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white/50 sm:h-8 sm:w-8"
                    style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}
                    title={badge.name}
                    aria-label={`${badge.name} badge`}
                    type="button"
                  >
                    <BadgeIcon className={`h-4 w-4 ${iconConfig.textColor}`} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* View all badges link */}
      {recentBadges.length > 0 && !showBadgeGrid && (
        <button
          onClick={() => setShowBadgeGrid(true)}
          className="text-xs text-primary hover:text-primary-lt focus-visible:ring-2 focus-visible:ring-white/50"
          type="button"
        >
          View all badges
        </button>
      )}
    </div>
  )
}
