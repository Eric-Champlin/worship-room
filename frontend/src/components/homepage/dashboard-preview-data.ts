import type { LucideIcon } from 'lucide-react'
import { BarChart3, Flame, Sprout, CheckSquare, Users, Moon } from 'lucide-react'

export interface PreviewCard {
  id: string
  icon: LucideIcon
  iconColor: string
  title: string
  description: string
}

export const PREVIEW_CARDS: PreviewCard[] = [
  { id: 'mood', icon: BarChart3, iconColor: 'text-purple-400', title: 'Mood Insights', description: 'See how God is meeting you over time.' },
  { id: 'streak', icon: Flame, iconColor: 'text-orange-400', title: 'Streaks & Faith Points', description: 'Build daily habits and watch your faith grow.' },
  { id: 'garden', icon: Sprout, iconColor: 'text-emerald-400', title: 'Growth Garden', description: 'A living illustration that grows with your journey.' },
  { id: 'practices', icon: CheckSquare, iconColor: 'text-purple-400', title: "Today's Practices", description: 'Your daily rhythm of prayer, journaling, and worship.' },
  { id: 'friends', icon: Users, iconColor: 'text-blue-400', title: 'Friends', description: 'Grow together and encourage each other.' },
  { id: 'evening', icon: Moon, iconColor: 'text-purple-400', title: 'Evening Reflection', description: 'Wind down your day with gratitude and prayer.' },
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
