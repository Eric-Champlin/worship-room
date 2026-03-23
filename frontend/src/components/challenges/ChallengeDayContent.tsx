import { Link } from 'react-router-dom'
import { Brain, Heart, MessageSquare, Music2, PenLine, Smile, type LucideIcon } from 'lucide-react'

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
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          {day.scripture.reference}
        </p>
        <p className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">
          {day.scripture.text}
        </p>
      </section>

      {/* Reflection section */}
      <section className="border-t border-white/10 py-8 sm:py-10">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
          <div className="mb-3 flex items-center gap-3">
            <ActionIcon
              className="h-5 w-5 shrink-0"
              style={{ color: themeColor }}
              aria-hidden="true"
            />
            <h3 className="text-sm text-white/40">Today&apos;s action:</h3>
          </div>
          <p className="text-lg font-medium text-white">{day.dailyAction}</p>

          {isCurrentDay && isAuthenticated && !isPastChallenge && (
            <button
              type="button"
              onClick={onMarkComplete}
              className="mt-4 w-full min-h-[44px] rounded-lg py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: themeColor }}
            >
              Mark Complete
            </button>
          )}

          <Link
            to={actionRoute}
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: themeColor }}
          >
            Go to {actionLabel} &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}
