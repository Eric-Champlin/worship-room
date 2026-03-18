import { useEffect, useRef, useState } from 'react'
import { Calendar, Star, TrendingUp, Heart } from 'lucide-react'

interface MonthlyStatCardsProps {
  daysActive: number
  daysInRange: number
  pointsEarned: number
  startLevel: string
  endLevel: string
  levelProgressPct: number
  moodTrendPct: number
}

function useCountUp(target: number, duration: number = 800): number {
  const [value, setValue] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }

    if (target === 0) {
      setValue(0)
      return
    }

    const start = performance.now()
    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [target, duration])

  return value
}

function getMoodTrendLabel(pct: number): string {
  if (pct > 0) return `Mood improved by ${pct} percent`
  if (pct < 0) return `Mood declined by ${Math.abs(pct)} percent`
  return 'Mood trend unchanged'
}

function getMoodTrendArrow(pct: number): string {
  if (pct > 0) return '↑'
  if (pct < 0) return '↓'
  return '→'
}

function getMoodTrendColor(pct: number): string {
  if (pct > 0) return 'text-emerald-400'
  if (pct < 0) return 'text-amber-400'
  return 'text-white/60'
}

export function MonthlyStatCards({
  daysActive,
  daysInRange,
  pointsEarned,
  startLevel,
  endLevel,
  levelProgressPct,
  moodTrendPct,
}: MonthlyStatCardsProps) {
  const animatedDays = useCountUp(daysActive)
  const animatedPoints = useCountUp(pointsEarned)
  const animatedPct = useCountUp(levelProgressPct)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* Days Active */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <Calendar className="mb-2 h-5 w-5 text-white/50" aria-hidden="true" />
        <p className="text-3xl font-bold text-white md:text-4xl">
          {animatedDays}
        </p>
        <p className="text-sm text-white/60">of {daysInRange} days</p>
      </div>

      {/* Points Earned */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <Star className="mb-2 h-5 w-5 text-white/50" aria-hidden="true" />
        <p className="text-3xl font-bold text-white md:text-4xl">
          {animatedPoints.toLocaleString()}
        </p>
        <p className="text-sm text-white/60">Faith Points</p>
      </div>

      {/* Level Progress */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <TrendingUp className="mb-2 h-5 w-5 text-white/50" aria-hidden="true" />
        <p className="text-lg font-semibold text-white">
          {startLevel} → {endLevel}
        </p>
        <div
          className="mt-2 h-1.5 rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={levelProgressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Level progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${animatedPct}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-white/60">{levelProgressPct}% progress</p>
      </div>

      {/* Mood Trend */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <Heart className="mb-2 h-5 w-5 text-white/50" aria-hidden="true" />
        <p className={`text-3xl font-bold md:text-4xl ${getMoodTrendColor(moodTrendPct)}`}>
          <span aria-label={getMoodTrendLabel(moodTrendPct)}>
            {getMoodTrendArrow(moodTrendPct)} {Math.abs(moodTrendPct)}%
          </span>
        </p>
        <p className="text-sm text-white/60">vs. last month</p>
      </div>
    </div>
  )
}
