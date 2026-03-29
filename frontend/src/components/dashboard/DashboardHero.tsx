import { useEffect, useRef, useState } from 'react'
import { Flame, Wind } from 'lucide-react'
import { LEVEL_THRESHOLDS } from '@/constants/dashboard/levels'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { AnimatedCounter } from './AnimatedCounter'

interface DashboardHeroProps {
  userName: string
  currentStreak?: number
  levelName?: string
  totalPoints?: number
  pointsToNextLevel?: number
  currentLevel?: number
  meditationMinutesThisWeek?: number
  gardenSlot?: React.ReactNode
  headerAction?: React.ReactNode
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour <= 11) return 'Good morning'
  if (hour >= 12 && hour <= 16) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHero({
  userName,
  currentStreak = 0,
  levelName = 'Seedling',
  totalPoints = 0,
  pointsToNextLevel = 100,
  currentLevel = 1,
  meditationMinutesThisWeek = 0,
  gardenSlot,
  headerAction,
}: DashboardHeroProps) {
  const greeting = getGreeting()
  const prefersReduced = useReducedMotion()
  const { greeting: seasonalGreeting, themeColor, isNamedSeason } = useLiturgicalSeason()

  // Track previous points for live animation
  const prevPointsRef = useRef(totalPoints)
  const isInitialRender = useRef(true)
  const [liveFrom, setLiveFrom] = useState<number | null>(null)
  const [glowColor, setGlowColor] = useState<string | null>(null)
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      prevPointsRef.current = totalPoints
      return
    }
    if (totalPoints !== prevPointsRef.current) {
      setLiveFrom(prevPointsRef.current)

      // Direction-aware glow
      if (!prefersReduced) {
        const isIncrease = totalPoints > prevPointsRef.current
        setGlowColor(
          isIncrease
            ? '0 0 8px rgba(139, 92, 246, 0.4)'  // violet
            : '0 0 8px rgba(217, 119, 6, 0.3)'   // amber
        )
        if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
        glowTimerRef.current = setTimeout(() => setGlowColor(null), 600)
      }

      prevPointsRef.current = totalPoints
    }
  }, [totalPoints, prefersReduced])

  useEffect(() => {
    return () => {
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current)
    }
  }, [])

  const currentThreshold =
    LEVEL_THRESHOLDS.find((l) => l.level === currentLevel)?.threshold ?? 0
  const nextThreshold =
    LEVEL_THRESHOLDS.find((l) => l.level === currentLevel + 1)?.threshold ??
    currentThreshold
  const isMaxLevel = pointsToNextLevel === 0

  const progressPercent = isMaxLevel
    ? 100
    : nextThreshold > currentThreshold
      ? ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100
      : 100

  return (
    <section
      aria-label="Dashboard hero"
      className="bg-gradient-to-b from-dashboard-gradient to-dashboard-dark pt-24 pb-6 md:pt-28 md:pb-8"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {gardenSlot}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <div className="flex w-full items-start justify-between gap-4">
            <h1 className="font-serif text-2xl text-white/90 md:text-3xl">
              {greeting},{' '}
              <span className="inline-block max-w-[70vw] truncate align-bottom md:max-w-none">
                {userName}
              </span>
              {isNamedSeason && seasonalGreeting && (
                <span
                  className="block text-lg md:inline md:text-2xl"
                  style={{ color: themeColor }}
                >
                  {' — '}{seasonalGreeting}
                </span>
              )}
            </h1>
            {headerAction && <div className="shrink-0 mt-1">{headerAction}</div>}
          </div>

          <div className="mt-4 flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex items-center gap-2">
              <Flame
                className={`h-5 w-5 ${currentStreak > 0 ? 'text-orange-400' : 'text-white/30'}`}
                aria-hidden="true"
              />
              <span className="text-lg font-semibold text-white">
                {currentStreak > 0
                  ? `${currentStreak} day${currentStreak !== 1 ? 's' : ''} streak`
                  : 'Start your streak today'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Wind
                className="h-5 w-5 text-white/60"
                aria-hidden="true"
              />
              <span className="text-sm text-white/60">
                {meditationMinutesThisWeek} min this week
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">{levelName}</span>
              <span className="text-sm text-white/60">
                {liveFrom !== null ? (
                  <><AnimatedCounter from={liveFrom} to={totalPoints} duration={600} key={totalPoints} /> Faith Points</>
                ) : (
                  <>{totalPoints.toLocaleString()} Faith Points</>
                )}
              </span>
              <div
                className="h-1.5 w-32 rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={totalPoints}
                aria-valuemin={isMaxLevel ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].threshold : currentThreshold}
                aria-valuemax={isMaxLevel ? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].threshold : nextThreshold}
                aria-label="Level progress"
                aria-valuetext={
                  isMaxLevel
                    ? 'Lighthouse — Max Level'
                    : `${levelName} — ${pointsToNextLevel} points to next level`
                }
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(progressPercent, 100)}%`,
                    boxShadow: glowColor ?? 'none',
                    transition: prefersReduced
                      ? 'none'
                      : 'width 600ms ease-out, box-shadow 300ms ease-out',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
