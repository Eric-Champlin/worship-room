import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Flame,
  Heart,
  Highlighter,
  Target,
  Rocket,
  Users,
  BarChart3,
  Moon,
  ListChecks,
  Sparkles,
} from 'lucide-react'

export type WidgetId =
  | 'anniversary'
  | 'devotional'
  | 'votd'
  | 'activity-checklist'
  | 'mood-chart'
  | 'streak'
  | 'gratitude'
  | 'reading-plan'
  | 'challenge'
  | 'quick-actions'
  | 'prayer-list'
  | 'recent-highlights'
  | 'friends'
  | 'weekly-recap'
  | 'evening-reflection'
  | 'getting-started'

export interface WidgetDefinition {
  id: WidgetId
  label: string
  icon: LucideIcon
  colSpan: string
  fullWidth: boolean
}

export const WIDGET_DEFINITIONS: WidgetDefinition[] = [
  { id: 'anniversary', label: 'Anniversary', icon: Sparkles, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'devotional', label: 'Devotional', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'votd', label: 'Verse of the Day', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'activity-checklist', label: 'Activity Checklist', icon: CheckCircle2, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'mood-chart', label: 'Mood Chart', icon: TrendingUp, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'streak', label: 'Streak & Faith Points', icon: Flame, colSpan: 'lg:col-span-2', fullWidth: false },
  { id: 'gratitude', label: 'Gratitude', icon: Heart, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'reading-plan', label: 'Reading Plan', icon: BookOpen, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'challenge', label: 'Challenge', icon: Target, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'quick-actions', label: 'Quick Actions', icon: Rocket, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'prayer-list', label: 'Prayer List', icon: Heart, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'recent-highlights', label: 'Recent Highlights', icon: Highlighter, colSpan: 'lg:col-span-3', fullWidth: false },
  { id: 'friends', label: 'Friends Preview', icon: Users, colSpan: 'lg:col-span-2', fullWidth: false },
  { id: 'weekly-recap', label: 'Weekly Recap', icon: BarChart3, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'evening-reflection', label: 'Evening Reflection', icon: Moon, colSpan: 'lg:col-span-5', fullWidth: true },
  { id: 'getting-started', label: 'Getting Started', icon: ListChecks, colSpan: 'lg:col-span-5', fullWidth: true },
]

export const WIDGET_MAP: Record<WidgetId, WidgetDefinition> = Object.fromEntries(
  WIDGET_DEFINITIONS.map((w) => [w.id, w]),
) as Record<WidgetId, WidgetDefinition>

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export const TIME_OF_DAY_ORDERS: Record<TimeOfDay, WidgetId[]> = {
  morning: [
    'anniversary',
    'devotional',
    'votd',
    'activity-checklist',
    'mood-chart',
    'streak',
    'gratitude',
    'reading-plan',
    'challenge',
    'quick-actions',
    'prayer-list',
    'recent-highlights',
    'friends',
    'weekly-recap',
  ],
  afternoon: [
    'anniversary',
    'activity-checklist',
    'reading-plan',
    'challenge',
    'prayer-list',
    'quick-actions',
    'mood-chart',
    'streak',
    'gratitude',
    'votd',
    'devotional',
    'recent-highlights',
    'friends',
  ],
  evening: [
    'anniversary',
    'evening-reflection',
    'gratitude',
    'activity-checklist',
    'mood-chart',
    'prayer-list',
    'reading-plan',
    'challenge',
    'streak',
    'votd',
    'recent-highlights',
    'friends',
    'quick-actions',
  ],
  night: [
    'anniversary',
    'evening-reflection',
    'gratitude',
    'votd',
    'prayer-list',
    'mood-chart',
    'streak',
    'quick-actions',
    'reading-plan',
    'challenge',
    'recent-highlights',
    'friends',
    'devotional',
    'weekly-recap',
  ],
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}
