import { Link } from 'react-router-dom'
import { Brain, Heart, MessageSquare, Music2, PenLine, Smile, type LucideIcon } from 'lucide-react'

import { ChallengeShareButton } from '@/components/challenges/ChallengeShareButton'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { getMusicDestination } from '@/data/challenge-prefills'
import type { ChallengeActionType, DayChallengeContent } from '@/types/challenges'

const ACTION_TYPE_ICONS: Record<ChallengeActionType, LucideIcon> = {
  pray: Heart,
  journal: PenLine,
  meditate: Brain,
  music: Music2,
  gratitude: Smile,
  prayerWall: MessageSquare,
}

interface ChallengeDayContentProps {
  day: DayChallengeContent
  themeColor: string
  isCurrentDay: boolean
  isAuthenticated: boolean
  isPastChallenge: boolean
  onMarkComplete: () => void
  actionRoute: string
  actionLabel: string
  challengeId?: string
  challengeTitle?: string
  completedDaysCount?: number
  streak?: number
  totalDays?: number
}

export function ChallengeDayContent({
  day,
  themeColor,
  isCurrentDay,
  isAuthenticated,
  isPastChallenge,
  onMarkComplete,
  actionRoute,
  actionLabel,
  challengeId,
  challengeTitle,
  completedDaysCount = 0,
  streak = 0,
  totalDays = 0,
}: ChallengeDayContentProps) {
  const ActionIcon = ACTION_TYPE_ICONS[day.actionType]
  const reflectionParagraphs = day.reflection.split('\n\n')

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      {/* Day title */}
      <h2 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
        Day {day.dayNumber}: {day.title}
      </h2>

      {/* Scripture section */}
      <section className="border-t border-white/10 py-8 sm:py-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/60">
          {day.scripture.reference}
        </p>
        <p className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">
          {day.scripture.text}
        </p>
      </section>

      {/* Reflection section */}
      <section className="border-t border-white/10 py-8 sm:py-10">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-widest text-white/60">
          Reflection
        </h3>
        <div className="space-y-4 text-base leading-relaxed text-white/80">
          {reflectionParagraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* Daily action callout */}
      <section className="border-t border-white/10 py-8 sm:py-10">
        <FrostedCard variant="subdued">
          <div className="mb-3 flex items-center gap-3">
            <ActionIcon
              className="h-5 w-5 shrink-0"
              style={{ color: themeColor }}
              aria-hidden="true"
            />
            <h3 className="text-sm text-white/60">Today&apos;s action:</h3>
          </div>
          <p className="text-lg font-medium text-white">{day.dailyAction}</p>

          {isCurrentDay && isAuthenticated && !isPastChallenge && (
            <button
              type="button"
              onClick={onMarkComplete}
              className="mt-4 w-full min-h-[44px] rounded-lg py-3 text-center font-semibold text-white transition-opacity motion-reduce:transition-none hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
              style={{ backgroundColor: themeColor }}
            >
              Mark Complete
            </button>
          )}

          <Link
            to={
              day.actionType === 'prayerWall'
                ? `${actionRoute}?challengePrayer=true`
                : day.actionType === 'music'
                  ? getMusicDestination(day.title)
                  : actionRoute
            }
            state={
              ['pray', 'journal', 'meditate'].includes(day.actionType)
                ? {
                    challengeContext: {
                      challengeId,
                      dayNumber: day.dayNumber,
                      dayTitle: day.title,
                      dailyAction: day.dailyAction,
                      actionType: day.actionType,
                    },
                  }
                : undefined
            }
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium transition-opacity motion-reduce:transition-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
            style={{ color: themeColor }}
          >
            Go to {actionLabel} &rarr;
          </Link>

          {isAuthenticated && challengeId && challengeTitle && completedDaysCount > 0 && (
            <ChallengeShareButton
              challengeTitle={challengeTitle}
              challengeId={challengeId}
              themeColor={themeColor}
              currentDay={day.dayNumber}
              totalDays={totalDays}
              streak={streak}
              completedDaysCount={completedDaysCount}
            />
          )}
        </FrostedCard>
      </section>
    </div>
  )
}
