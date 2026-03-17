import { useMemo } from 'react'
import {
  TrendingUp,
  Activity,
  BookOpen,
  Calendar,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

interface InsightCardsProps {
  hasData: boolean
}

interface InsightVariant {
  icon: LucideIcon
  title: string
  text: string
}

const INSIGHT_VARIANTS: Record<string, InsightVariant[]> = {
  trend: [
    {
      icon: TrendingUp,
      title: 'Trend Summary',
      text: "Your mood has improved 15% over the last 2 weeks. You're on an upward trajectory — keep going!",
    },
    {
      icon: TrendingUp,
      title: 'Trend Summary',
      text: "You've been consistent in checking in this month. Showing up is half the battle — well done.",
    },
    {
      icon: TrendingUp,
      title: 'Trend Summary',
      text: 'Your best days tend to cluster together. Momentum is real — one good day often leads to another.',
    },
  ],
  correlation: [
    {
      icon: Activity,
      title: 'Activity Insight',
      text: 'You tend to feel better on days you journal. Consider making it a daily practice.',
    },
    {
      icon: Activity,
      title: 'Activity Insight',
      text: 'Prayer seems to lift your mood. On days you pray, your average mood is one level higher.',
    },
    {
      icon: Activity,
      title: 'Activity Insight',
      text: 'Meditation and mood go hand in hand for you. Your calmest days often follow a meditation session.',
    },
  ],
  scripture: [
    {
      icon: BookOpen,
      title: 'Scripture Connection',
      text: 'You found peace in Psalms — it was featured on 4 of your best days. The Psalms seem to speak to your heart.',
    },
    {
      icon: BookOpen,
      title: 'Scripture Connection',
      text: "The verses you've seen during Good days share a theme of gratitude. There might be something in that.",
    },
    {
      icon: BookOpen,
      title: 'Scripture Connection',
      text: 'You responded well to verses about rest and stillness. Sometimes the quietest words carry the most peace.',
    },
  ],
  weekly: [
    {
      icon: Calendar,
      title: 'Weekly Summary',
      text: 'This week: 5 check-ins, average mood: Good. You showed up consistently — that matters.',
    },
    {
      icon: Calendar,
      title: 'Weekly Summary',
      text: "You checked in every day this week. That kind of faithfulness builds something beautiful over time.",
    },
    {
      icon: Calendar,
      title: 'Weekly Summary',
      text: '4 out of 7 days this week were Good or Thriving. The light is breaking through.',
    },
  ],
}

const INSIGHT_TYPES = ['trend', 'correlation', 'scripture', 'weekly'] as const

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getInsightsForDay(dayOfYear: number): InsightVariant[] {
  return INSIGHT_TYPES.map((type) => {
    const variants = INSIGHT_VARIANTS[type]
    const index = dayOfYear % variants.length
    return variants[index]
  })
}

export function InsightCards({ hasData }: InsightCardsProps) {
  const insights = useMemo(() => {
    const day = getDayOfYear()
    return getInsightsForDay(day)
  }, [])

  if (!hasData) {
    return (
      <section aria-labelledby="insights-title">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h2
            id="insights-title"
            className="text-base font-semibold text-white md:text-lg"
          >
            Insights
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
          <Sparkles
            className="mx-auto mb-3 h-8 w-8 text-white/30"
            aria-hidden="true"
          />
          <p className="text-sm text-white/60 leading-relaxed md:text-base">
            Start checking in to see your insights grow. Each day you share how
            you&apos;re feeling, we&apos;ll have more to reflect on together.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="insights-title">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white/60" aria-hidden="true" />
        <h2
          id="insights-title"
          className="text-base font-semibold text-white md:text-lg"
        >
          Insights
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.icon
          return (
            <div
              key={insight.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6"
            >
              <div className="mb-2 flex items-center gap-2">
                <Icon
                  className="h-5 w-5 text-white/60"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium uppercase tracking-wide text-white/50">
                  {insight.title}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/80 md:text-base">
                {insight.text}
              </p>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-center text-xs text-white/40">
        Insights are illustrative examples. Personalized AI insights coming
        soon.
      </p>
    </section>
  )
}

// Export for testing
export { getDayOfYear, getInsightsForDay, INSIGHT_VARIANTS }
