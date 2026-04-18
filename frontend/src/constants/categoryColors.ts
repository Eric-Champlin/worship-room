import type { ChallengeSeason } from '@/types/challenges'

/**
 * Alias for ChallengeSeason. Semantic difference is naming only; the enum values
 * are identical. Spec terminology calls these "categories"; the data model uses "season".
 */
export type ChallengeCategory = ChallengeSeason

export interface CategoryColorTokens {
  /** Tailwind bg class for tag (~15% tint) */
  bgClass: string
  /** Tailwind text class for tag foreground — tuned for WCAG AA at 12px on FrostedCard bg */
  fgClass: string
  /** Tailwind border class for tag outline */
  borderClass: string
  /** Hex color for hero overlay tinting; sourced centrally */
  themeColor: string
}

export const CATEGORY_COLORS: Record<ChallengeCategory, CategoryColorTokens> = {
  pentecost: {
    bgClass: 'bg-red-500/15',
    fgClass: 'text-red-300',
    borderClass: 'border-red-400/30',
    themeColor: '#DC2626',
  },
  advent: {
    bgClass: 'bg-violet-500/15',
    fgClass: 'text-violet-300',
    borderClass: 'border-violet-400/30',
    themeColor: '#7C3AED',
  },
  lent: {
    bgClass: 'bg-purple-500/15',
    fgClass: 'text-purple-300',
    borderClass: 'border-purple-400/30',
    themeColor: '#6B21A8',
  },
  newyear: {
    bgClass: 'bg-emerald-500/15',
    fgClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/30',
    themeColor: '#059669',
  },
  easter: {
    bgClass: 'bg-amber-500/15',
    fgClass: 'text-amber-200',
    borderClass: 'border-amber-400/30',
    themeColor: '#D97706',
  },
}

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  pentecost: 'Pentecost',
  advent: 'Advent',
  lent: 'Lent',
  newyear: 'New Year',
  easter: 'Easter',
}
