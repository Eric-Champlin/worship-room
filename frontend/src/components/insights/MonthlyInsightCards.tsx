import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { getDayOfYear, getInsightCardsForDay } from '@/constants/dashboard/ai-insights'

export function MonthlyInsightCards() {
  const insights = useMemo(() => {
    const day = getDayOfYear()
    return getInsightCardsForDay(day, 3, 5)
  }, [])

  return (
    <section aria-labelledby="monthly-insights-title">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="monthly-insights-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Monthly Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div
              key={insight.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon
                  className="h-5 w-5 text-white/60"
                  aria-hidden="true"
                />
                <span className="text-xs uppercase tracking-wider text-white/60">
                  {insight.categoryLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                {insight.text}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
