import { TrendingUp, Activity, BookOpen, Lightbulb, type LucideIcon } from 'lucide-react'

export interface AIInsightCard {
  id: string
  category: 'trend' | 'correlation' | 'scripture' | 'recommendation'
  categoryLabel: string
  icon: LucideIcon
  text: string
}

export const AI_INSIGHT_CARDS: AIInsightCard[] = [
  // Trend Summaries (4)
  {
    id: 'trend-1',
    category: 'trend',
    categoryLabel: 'Trend',
    icon: TrendingUp,
    text: "Your mood has improved 15% over the last 2 weeks. You're on an upward trajectory — keep going!",
  },
  {
    id: 'trend-2',
    category: 'trend',
    categoryLabel: 'Trend',
    icon: TrendingUp,
    text: "You've been most consistent on Wednesdays and Thursdays. Mid-week seems to be your rhythm.",
  },
  {
    id: 'trend-3',
    category: 'trend',
    categoryLabel: 'Trend',
    icon: TrendingUp,
    text: "This is your best week in the last month! Whatever you've been doing, it's working.",
  },
  {
    id: 'trend-4',
    category: 'trend',
    categoryLabel: 'Trend',
    icon: TrendingUp,
    text: 'Your mood dipped mid-week — but weekends seem to recharge you. Rest is part of the journey.',
  },
  // Activity Correlations (3)
  {
    id: 'correlation-1',
    category: 'correlation',
    categoryLabel: 'Activity',
    icon: Activity,
    text: "On days you journal, your average mood is Good (4.1) vs. Okay (3.2) on days you don't. Journaling seems to make a difference.",
  },
  {
    id: 'correlation-2',
    category: 'correlation',
    categoryLabel: 'Activity',
    icon: Activity,
    text: 'Listening to worship music correlates with a 20% mood boost the next day. Music is good medicine.',
  },
  {
    id: 'correlation-3',
    category: 'correlation',
    categoryLabel: 'Activity',
    icon: Activity,
    text: 'You tend to pray more on Heavy days — and your mood improves the day after. Prayer is working.',
  },
  // Scripture Connections (2)
  {
    id: 'scripture-1',
    category: 'scripture',
    categoryLabel: 'Scripture',
    icon: BookOpen,
    text: 'Psalm 34:18 appeared on 3 of your Struggling days — and each time, your mood improved the next day. God is close to the brokenhearted.',
  },
  {
    id: 'scripture-2',
    category: 'scripture',
    categoryLabel: 'Scripture',
    icon: BookOpen,
    text: 'You gravitate toward Psalms when feeling Heavy — they seem to bring peace. The Psalms know your heart.',
  },
  // Personalized Recommendations (2)
  {
    id: 'recommendation-1',
    category: 'recommendation',
    categoryLabel: 'Recommendation',
    icon: Lightbulb,
    text: 'Try journaling before bed — your best mood days often follow evening journal entries.',
  },
  {
    id: 'recommendation-2',
    category: 'recommendation',
    categoryLabel: 'Recommendation',
    icon: Lightbulb,
    text: "You haven't explored the Sleep & Rest tab yet — it might help on Heavy days.",
  },
]

export function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getInsightCardsForDay(
  dayOfYear: number,
  count: number = 4,
  offset: number = 0,
): AIInsightCard[] {
  const total = AI_INSIGHT_CARDS.length
  const startIndex = (dayOfYear + offset) % total
  const result: AIInsightCard[] = []
  for (let i = 0; i < count; i++) {
    result.push(AI_INSIGHT_CARDS[(startIndex + i) % total])
  }
  return result
}
