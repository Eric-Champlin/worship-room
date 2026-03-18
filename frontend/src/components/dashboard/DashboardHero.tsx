import { useEffect, useRef, useState } from 'react'
import { Flame } from 'lucide-react'
import { LEVEL_THRESHOLDS } from '@/constants/dashboard/levels'
import { AnimatedCounter } from './AnimatedCounter'

interface DashboardHeroProps {
  userName: string
  currentStreak?: number
  levelName?: string
  totalPoints?: number
  pointsToNextLevel?: number
  currentLevel?: number
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
}: DashboardHeroProps) {
  const greeting = getGreeting()

  // Track previous points for live animation
  const prevPointsRef = useRef(totalPoints)
  const isInitialRender = useRef(true)
  const [liveFrom, setLiveFrom] = useState<number | null>(null)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      prevPointsRef.current = totalPoints
      return
    }
    if (totalPoints !== prevPointsRef.current) {
      setLiveFrom(prevPointsRef.current)
      prevPointsRef.current = totalPoints
    }
  }, [totalPoints])

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
      className="bg-gradient-to-b from-[#1a0533] to-[#0f0a1e] pt-24 pb-6 md:pt-28 md:pb-8"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="font-serif text-2xl text-white/90 md:text-3xl">
            {greeting},{' '}
            <span className="inline-block max-w-[70vw] truncate align-bottom md:max-w-none">
              {userName}
            </span>
          </h1>

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
                aria-valuemin={isMaxLevel ? 10000 : currentThreshold}
                aria-valuemax={isMaxLevel ? 10000 : nextThreshold}
                aria-label="Level progress"
                aria-valuetext={
                  isMaxLevel
                    ? 'Lighthouse — Max Level'
                    : `${levelName} — ${pointsToNextLevel} points to next level`
                }
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
