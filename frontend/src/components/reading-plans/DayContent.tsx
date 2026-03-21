import { forwardRef } from 'react'

import type { PlanDayContent as DayContentType } from '@/types/reading-plans'

interface DayContentProps {
  day: DayContentType
}

export const DayContent = forwardRef<HTMLDivElement, DayContentProps>(
  function DayContent({ day }, ref) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Day title */}
        <h2 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
          Day {day.dayNumber}: {day.title}
        </h2>

        {/* Passage section */}
        <section className="border-t border-white/10 py-8 sm:py-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
            {day.passage.reference}
          </p>
          <div className="font-serif text-base italic leading-relaxed text-white/90 sm:text-lg">
            {day.passage.verses.map((verse) => (
              <span key={verse.number}>
                <sup className="mr-1 align-super font-sans text-xs not-italic text-white/30">
                  {verse.number}
                </sup>
                {verse.text}{' '}
              </span>
            ))}
          </div>
        </section>

        {/* Reflection section */}
        <section className="border-t border-white/10 py-8 sm:py-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
            Reflection
          </p>
          <div className="space-y-4 text-base leading-relaxed text-white/80">
            {day.reflection.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Prayer section */}
        <section className="border-t border-white/10 py-8 sm:py-10">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
            Closing Prayer
          </p>
          <p className="font-serif text-base italic leading-relaxed text-white/80">
            {day.prayer}
          </p>
        </section>

        {/* Action step section */}
        <section className="border-t border-white/10 py-8 sm:py-10" ref={ref}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
            <p className="text-sm text-white/40">Today&apos;s Action Step</p>
            <p className="mt-2 text-lg font-medium text-white">
              {day.actionStep}
            </p>
          </div>
        </section>
      </div>
    )
  },
)
