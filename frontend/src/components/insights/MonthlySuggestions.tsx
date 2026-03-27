import { Lightbulb, Heart, Brain, PenLine, Sparkles, BookOpen, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MonthSuggestion } from '@/hooks/useMonthlyReportSuggestions'

const ICON_MAP = { Heart, Brain, PenLine, Sparkles, BookOpen, TrendingUp }

interface MonthlySuggestionsProps {
  suggestions: MonthSuggestion[]
}

export function MonthlySuggestions({ suggestions }: MonthlySuggestionsProps) {
  if (suggestions.length === 0) return null

  return (
    <section aria-labelledby="suggestions-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="suggestions-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Suggestions for Next Month
        </h2>
      </div>
      <div className="space-y-3">
        {suggestions.map((s) => {
          const Icon = ICON_MAP[s.icon]
          return (
            <div
              key={s.id}
              className="rounded-xl border border-white/10 bg-white/[0.08] p-4"
            >
              <div className="flex items-start gap-3">
                <Icon
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/60"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-white">{s.text}</p>
                  {s.topActivities && s.topActivities.length > 0 && (
                    <p className="mt-1 text-xs text-white/50">
                      {s.topActivities
                        .map((a) => `${a.name} (${a.count} times)`)
                        .join(', ')}
                    </p>
                  )}
                  {s.ctas.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {s.ctas.map((cta) => (
                        <Link
                          key={cta.link}
                          to={cta.link}
                          className="block text-sm text-primary-lt transition-colors hover:text-primary"
                        >
                          {cta.text}
                        </Link>
                      ))}
                    </div>
                  )}
                  {s.id === 'mood-improved' && s.ctas.length === 0 && (
                    <p className="mt-2 text-sm text-primary-lt">Keep it up!</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
