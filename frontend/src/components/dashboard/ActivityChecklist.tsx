import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CircleCheck, Circle, Moon } from 'lucide-react'
import { ACTIVITY_CHECKLIST_NAMES, ACTIVITY_POINTS } from '@/constants/dashboard/activity-points'
import { useReadingPlanProgress } from '@/hooks/useReadingPlanProgress'
import { isEveningTime } from '@/services/evening-reflection-storage'
import type { ActivityType } from '@/types/dashboard'

interface ActivityChecklistProps {
  todayActivities: Record<ActivityType, boolean>
  // todayMultiplier is passed through for Spec 8 celebrations (multiplier tier-crossing animations)
  todayMultiplier: number
  animate?: boolean
}

// Base 7 activities — gratitude placed after prayerWall per spec
const BASE_ACTIVITY_ORDER: ActivityType[] = [
  'mood',
  'pray',
  'listen',
  'prayerWall',
  'gratitude',
  'meditate',
  'journal',
]

const RING_RADIUS = 24
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function getMultiplierPreview(
  completedCount: number,
  _totalActivities: number,
): {
  text: string
  isCelebration: boolean
} {
  if (completedCount >= 7) {
    return { text: 'Full Worship Day! 2x points earned!', isCelebration: true }
  }
  switch (completedCount) {
    case 0:
      return { text: 'Complete 2 activities for 1.25x bonus!', isCelebration: false }
    case 1:
      return { text: 'Complete 1 more for 1.25x bonus!', isCelebration: false }
    case 2:
      return { text: 'Complete 2 more for 1.5x bonus!', isCelebration: false }
    case 3:
      return { text: 'Complete 1 more for 1.5x bonus!', isCelebration: false }
    case 4:
      return { text: 'Complete 3 more for 2x Full Worship Day!', isCelebration: false }
    case 5:
      return { text: 'Complete 2 more for 2x Full Worship Day!', isCelebration: false }
    case 6:
      return { text: 'Complete 1 more for 2x Full Worship Day!', isCelebration: false }
    default:
      return { text: '', isCelebration: false }
  }
}

export function ActivityChecklist({
  todayActivities,
  todayMultiplier: _todayMultiplier,
  animate = false,
}: ActivityChecklistProps) {
  const { getActivePlanId } = useReadingPlanProgress()
  const hasActivePlan = !!getActivePlanId()

  // Check once on mount whether to show reflection (after 6 PM)
  const showReflection = useMemo(() => isEveningTime(), [])

  // Check once on mount whether user has local visit history
  const hasLocalVisits = useMemo(() => {
    try {
      const raw = localStorage.getItem('wr_local_visits')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) && parsed.length > 0
    } catch {
      return false
    }
  }, [])

  // Build activity list: base 7 + optional readingPlan + conditional localVisit + conditional reflection
  const activityList: ActivityType[] = (() => {
    const list: ActivityType[] = hasActivePlan
      ? [...BASE_ACTIVITY_ORDER.slice(0, 4), 'readingPlan', ...BASE_ACTIVITY_ORDER.slice(4)]
      : [...BASE_ACTIVITY_ORDER]
    if (hasLocalVisits) {
      list.push('localVisit')
    }
    if (showReflection) {
      list.push('reflection')
    }
    return list
  })()

  const totalActivities = activityList.length
  const completedCount = activityList.filter((t) => todayActivities[t]).length
  const targetOffset = RING_CIRCUMFERENCE * (1 - completedCount / totalActivities)
  const multiplierPreview = getMultiplierPreview(completedCount, totalActivities)

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Animate progress ring from 0% on entry
  const [ringOffset, setRingOffset] = useState(
    animate && !prefersReducedMotion ? RING_CIRCUMFERENCE : targetOffset,
  )

  useEffect(() => {
    if (animate && !prefersReducedMotion) {
      // Brief delay then animate to current value
      const timer = requestAnimationFrame(() => {
        setRingOffset(targetOffset)
      })
      return () => cancelAnimationFrame(timer)
    }
  }, [animate, prefersReducedMotion, targetOffset])

  const strokeDashoffset = ringOffset

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            role="img"
            aria-label={`${completedCount} of ${totalActivities} daily activities completed`}
          >
            {/* Background circle */}
            <circle
              cx="30"
              cy="30"
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="30"
              cy="30"
              r={RING_RADIUS}
              stroke="#6D28D9"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              style={
                prefersReducedMotion
                  ? undefined
                  : { transition: 'stroke-dashoffset 500ms ease-out' }
              }
            />
          </svg>
          {/* Center text */}
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
            {completedCount}/{totalActivities}
          </span>
        </div>

        {/* Activity list */}
        <div className="w-full space-y-2">
          {activityList.map((type) => {
            const completed = todayActivities[type]
            const points = ACTIVITY_POINTS[type]
            const name = ACTIVITY_CHECKLIST_NAMES[type]
            const isReadingPlan = type === 'readingPlan'
            const isReflection = type === 'reflection'

            const iconColor = completed ? 'text-success' : 'text-white/20'
            let Icon
            if (isReadingPlan) {
              Icon = <BookOpen className={`h-5 w-5 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
            } else if (isReflection) {
              Icon = completed
                ? <CircleCheck className="h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />
                : <Moon className="h-5 w-5 flex-shrink-0 text-indigo-300/50" aria-hidden="true" />
            } else {
              Icon = completed
                ? <CircleCheck className="h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />
                : <Circle className="h-5 w-5 flex-shrink-0 text-white/20" aria-hidden="true" />
            }

            return (
              <div
                key={type}
                className="flex items-center gap-2"
                aria-label={
                  completed
                    ? `${name} — completed, ${points} points earned`
                    : `${name} — not yet completed, ${points} points available`
                }
              >
                {Icon}
                <span
                  className={
                    completed ? 'text-sm text-white' : 'text-sm text-white/50'
                  }
                >
                  {name}
                </span>
                <span
                  className={
                    completed
                      ? 'ml-auto text-xs text-success'
                      : 'ml-auto text-xs text-white/30'
                  }
                >
                  +{points} pts
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* New day encouragement (when all unchecked) */}
      {completedCount === 0 && (
        <p className="text-center text-sm text-white/50 sm:text-left">
          A new day, a new opportunity to grow
        </p>
      )}

      {/* Multiplier preview */}
      <div className="border-t border-white/5 pt-3">
        <p
          className={
            multiplierPreview.isCelebration
              ? 'text-xs font-medium text-amber-300'
              : 'text-xs text-white/60'
          }
        >
          {multiplierPreview.text}
        </p>
      </div>
    </div>
  )
}
