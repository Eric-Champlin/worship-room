import type { LucideIcon } from 'lucide-react'
import { BarChart3, Flame, Sprout, CheckSquare, Users, Moon } from 'lucide-react'

export interface PreviewCard {
  id: string
  icon: LucideIcon
  title: string
}

export const PREVIEW_CARDS: PreviewCard[] = [
  { id: 'mood', icon: BarChart3, title: 'Mood Insights' },
  { id: 'streak', icon: Flame, title: 'Streak & Faith Points' },
  { id: 'garden', icon: Sprout, title: 'Growth Garden' },
  { id: 'practices', icon: CheckSquare, title: "Today's Practices" },
  { id: 'friends', icon: Users, title: 'Friends' },
  { id: 'evening', icon: Moon, title: 'Evening Reflection' },
]

const HEATMAP_LEVELS = [
  'bg-white/[0.04]',
  'bg-purple-900/40',
  'bg-purple-600/40',
  'bg-purple-400/50',
  'bg-purple-300/60',
] as const

export function getHeatmapColor(row: number, col: number): string {
  return HEATMAP_LEVELS[(row * 7 + col * 13 + 42) % 5]
}

export const PRACTICES = [
  { label: 'Mood Check-in', done: true },
  { label: 'Devotional', done: true },
  { label: 'Prayer', done: false },
  { label: 'Journal', done: false },
  { label: 'Meditation', done: false },
]

export const FRIENDS = [
  { name: 'Sarah M.', color: 'bg-purple-500', streak: 12 },
  { name: 'David K.', color: 'bg-emerald-500', streak: 8 },
  { name: 'Maria L.', color: 'bg-amber-500', streak: 5 },
]
