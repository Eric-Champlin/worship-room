import type { LucideIcon } from 'lucide-react'
import { BookOpen, Star, Heart, Moon } from 'lucide-react'

interface PlanIconConfig {
  icon: LucideIcon
  colorClass: string
}

const PLAN_ICON_MAP: Record<string, PlanIconConfig> = {
  'psalms-30-days': { icon: BookOpen, colorClass: 'text-blue-400' },
  'john-story-of-jesus': { icon: Star, colorClass: 'text-amber-400' },
  'when-youre-anxious': { icon: Heart, colorClass: 'text-teal-400' },
  'when-you-cant-sleep': { icon: Moon, colorClass: 'text-indigo-400' },
}

const DEFAULT_ICON_CONFIG: PlanIconConfig = {
  icon: BookOpen,
  colorClass: 'text-white/70',
}

export function getPlanIconConfig(slug: string): PlanIconConfig {
  return PLAN_ICON_MAP[slug] ?? DEFAULT_ICON_CONFIG
}
