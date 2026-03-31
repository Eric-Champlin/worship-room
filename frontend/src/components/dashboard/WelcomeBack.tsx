import { useState, useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useToastSafe } from '@/components/ui/Toast'
import { getLocalDateString } from '@/utils/date'
import { CHALLENGES } from '@/data/challenges'
import { getLiturgicalSeason } from '@/constants/liturgical-calendar'
import { cn } from '@/lib/utils'

interface WelcomeBackProps {
  userName: string
  faithPoints: {
    currentStreak: number
    previousStreak: number | null
    isFreeRepairAvailable: boolean
    totalPoints: number
    repairStreak: (useFreeRepair: boolean) => void
  }
  onStepIn: () => void
  onSkipToDashboard: () => void
}

function computeWhatsNew(): { key: string; icon: string; label: string; highlight: string }[] {
  const items: { key: string; icon: string; label: string; highlight: string }[] = []

  try {
    const raw = localStorage.getItem('wr_streak')
    if (!raw) return items
    const streakData = JSON.parse(raw)
    const lastActiveDate = streakData?.lastActiveDate
    if (!lastActiveDate) return items

    const lastDate = new Date(lastActiveDate + 'T00:00:00')
    const today = new Date(getLocalDateString() + 'T00:00:00')

    // 1. Check for new challenge start dates
    const currentYear = today.getFullYear()
    for (const challenge of CHALLENGES) {
      const startDate = challenge.getStartDate(currentYear)
      if (startDate > lastDate && startDate <= today) {
        items.push({
          key: `challenge-${challenge.id}`,
          icon: '\uD83C\uDFAF',
          label: 'New challenge:',
          highlight: challenge.title,
        })
        break // Max 1 challenge item
      }
    }

    // 2. Check friend activity
    const friendsRaw = localStorage.getItem('wr_friends')
    if (friendsRaw) {
      const friendsData = JSON.parse(friendsRaw)
      const friendCount = friendsData?.friends?.length ?? 0
      if (friendCount > 0) {
        const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        const estimatedPrayers = Math.min(friendCount, 3) * daysSince * 3
        if (estimatedPrayers > 0) {
          items.push({
            key: 'friend-activity',
            icon: '\uD83D\uDE4F',
            label: `~${estimatedPrayers} prayers shared on`,
            highlight: 'the Prayer Wall',
          })
        }
      }
    }
    // 3. Check for seasonal devotional content
    const lastSeason = getLiturgicalSeason(lastDate)
    const currentSeason = getLiturgicalSeason(today)
    if (currentSeason.currentSeason.id !== lastSeason.currentSeason.id && currentSeason.currentSeason.id !== 'ordinary-time') {
      items.push({
        key: `season-${currentSeason.currentSeason.id}`,
        icon: '\u2728',
        label: '',
        highlight: `${currentSeason.currentSeason.name} devotionals are available`,
      })
    }
  } catch {
    // Malformed data — return whatever we have
  }

  return items.slice(0, 3)
}

export function WelcomeBack({ userName, faithPoints, onStepIn, onSkipToDashboard }: WelcomeBackProps) {
  const prefersReduced = useReducedMotion()
  const { playSoundEffect } = useSoundEffects()
  const { showToast } = useToastSafe()
  const [repairDone, setRepairDone] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const repairTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    playSoundEffect('chime')
    headingRef.current?.focus()
  }, [playSoundEffect])

  useEffect(() => {
    return () => {
      if (repairTimerRef.current) clearTimeout(repairTimerRef.current)
    }
  }, [])

  const whatsNewItems = useMemo(() => computeWhatsNew(), [])

  const previousStreak = faithPoints.previousStreak
  const showStreakSection = previousStreak !== null && previousStreak > 1
  const canRepairFree = faithPoints.isFreeRepairAvailable && showStreakSection
  const canRepairPaid = !faithPoints.isFreeRepairAvailable && faithPoints.totalPoints >= 50 && showStreakSection
  const showRepairCard = (canRepairFree || canRepairPaid) && !repairDone

  const handleRepair = () => {
    faithPoints.repairStreak(canRepairFree)
    setRepairDone(true)
    playSoundEffect('ascending')
    showToast(`\uD83D\uDD25 Streak restored to ${previousStreak} days!`, 'success')
    repairTimerRef.current = setTimeout(() => onStepIn(), 1500)
  }

  const fadeIn = prefersReduced ? '' : 'motion-safe:animate-fade-in'
  const stagger = (delayMs: number) =>
    prefersReduced ? {} : { animationDelay: `${delayMs}ms`, animationFillMode: 'backwards' as const }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,_rgb(59,7,100)_0%,_transparent_60%),_linear-gradient(rgb(13,6,32)_0%,_rgb(30,11,62)_50%,_rgb(13,6,32)_100%)]">
      <div className="flex w-full max-w-md flex-col items-center px-6 text-center">

        {/* Greeting */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className={cn('font-script text-4xl font-bold text-white sm:text-5xl', fadeIn)}
          style={stagger(0)}
        >
          {userName ? `Welcome back, ${userName}` : 'Welcome Back'}
        </h1>
        <p
          className={cn('mt-2 text-lg text-white/70', fadeIn)}
          style={stagger(100)}
        >
          We've been holding your spot.
        </p>

        {/* Streak section */}
        {showStreakSection && (
          <div className={cn('mt-6', fadeIn)} style={stagger(200)}>
            <p className="text-white/80">
              You had a <span className="font-semibold text-white">{previousStreak}-day</span> streak going.
            </p>
            <p className="mt-1 text-sm italic text-white/60">
              Life happens — and God's grace covers every gap.
            </p>
          </div>
        )}

        {/* Streak Repair Card */}
        {showRepairCard && (
          <div
            className={cn(
              'mt-4 w-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm',
              fadeIn,
            )}
            style={stagger(500)}
          >
            <p className="text-lg font-medium text-white">
              {'\uD83D\uDD25'} Restore your streak?
            </p>
            <button
              onClick={handleRepair}
              className="mt-3 min-h-[44px] w-full rounded-full bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto"
            >
              {canRepairFree ? 'Use Free Repair' : 'Repair for 50 pts'}
            </button>
          </div>
        )}

        {/* "What's New" section */}
        {whatsNewItems.length > 0 && (
          <div className={cn('mt-6 w-full text-left', fadeIn)} style={stagger(700)}>
            <p className="text-sm font-medium text-white/50">While you were away:</p>
            <ul className="mt-2 space-y-2">
              {whatsNewItems.map((item, i) => (
                <li
                  key={item.key}
                  className={cn('text-sm text-white/70', fadeIn)}
                  style={stagger(700 + (i + 1) * 100)}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label && <>{item.label} </>}
                  <span className="text-white/90">{item.highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTAs */}
        {!repairDone && (
          <div className={cn('mt-8 flex w-full flex-col items-center gap-3', fadeIn)} style={stagger(900)}>
            <button
              onClick={onStepIn}
              className="min-h-[44px] w-full rounded-full bg-primary px-8 py-3 font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:w-auto"
            >
              Step Back In
            </button>
            <button
              onClick={onSkipToDashboard}
              className="min-h-[44px] text-sm text-white/50 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:rounded"
            >
              Skip to Dashboard
            </button>
          </div>
        )}

        {/* Aria live region for repair announcement */}
        {repairDone && (
          <p className="sr-only" role="status" aria-live="polite">
            Streak restored to {previousStreak} days. Continuing to mood check-in.
          </p>
        )}
      </div>
    </div>
  )
}
