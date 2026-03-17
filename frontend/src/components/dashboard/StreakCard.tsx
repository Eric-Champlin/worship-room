import {
  Flame,
  Sprout,
  Leaf,
  Flower2,
  TreePine,
  Trees,
  Landmark,
} from 'lucide-react'
import { LEVEL_THRESHOLDS } from '@/constants/dashboard/levels'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  totalPoints: number
  currentLevel: number
  levelName: string
  pointsToNextLevel: number
  todayMultiplier: number
}

const LEVEL_ICONS: Record<number, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  1: Sprout,
  2: Leaf,
  3: Flower2,
  4: TreePine,
  5: Trees,
  6: Landmark,
}

function getNextLevelInfo(currentLevel: number) {
  const next = LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1)
  if (!next) return null
  return { threshold: next.threshold, name: next.name }
}

function getRecentBadges(): { name: string; earnedAt: string }[] {
  try {
    const raw = localStorage.getItem('wr_badges')
    if (!raw) return []
    const data = JSON.parse(raw)
    const earned = data?.earned ?? []
    if (!Array.isArray(earned) || earned.length === 0) return []
    return earned
      .filter((b: { earnedAt?: string }) => b.earnedAt)
      .sort(
        (a: { earnedAt: string }, b: { earnedAt: string }) =>
          new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime(),
      )
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
}: StreakCardProps) {
  const LevelIcon = LEVEL_ICONS[currentLevel] ?? Sprout
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

  return (
    <div className="space-y-4">
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
                <span className="text-3xl font-bold text-white md:text-4xl">
                  {currentStreak}
                </span>
                <span className="text-sm text-white/60">
                  {currentStreak === 1 ? 'day streak' : 'days streak'}
                </span>
              </div>
              <p className="text-xs text-white/40">
                Longest: {longestStreak} days
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Flame
              className="h-8 w-8 text-white/30 md:h-9 md:w-9"
              aria-hidden="true"
            />
            <div>
              <p className="text-lg text-white/70">Start your streak today</p>
              <p className="text-xs text-white/40">
                Longest: {longestStreak} days
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Faith Points & Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">
            {totalPoints} Faith Points
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

        <p className="text-xs text-white/40">
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
              {recentBadges.map((badge, i) => (
                <div
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-xs font-medium text-primary-lt"
                  title={badge.name}
                >
                  {badge.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
