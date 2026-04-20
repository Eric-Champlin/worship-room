import type { SoundCategory } from '@/types/music'

export type { SoundCategory }

export interface SoundCategoryTokens {
  bgClass: string
  borderClass: string
  iconInactiveClass: string
  iconActiveClass: string
  activeGlow: string
}

export const SOUND_CATEGORY_COLORS: Record<SoundCategory, SoundCategoryTokens> = {
  nature: {
    bgClass: 'bg-emerald-500/[0.08]',
    borderClass: 'border-emerald-400/20',
    iconInactiveClass: 'text-emerald-300/70',
    iconActiveClass: 'text-emerald-200',
    activeGlow: 'shadow-[0_0_16px_rgba(52,211,153,0.45)]',
  },
  environments: {
    bgClass: 'bg-amber-500/[0.08]',
    borderClass: 'border-amber-400/20',
    iconInactiveClass: 'text-amber-300/70',
    iconActiveClass: 'text-amber-200',
    activeGlow: 'shadow-[0_0_16px_rgba(251,191,36,0.45)]',
  },
  spiritual: {
    bgClass: 'bg-violet-500/[0.08]',
    borderClass: 'border-violet-400/20',
    iconInactiveClass: 'text-violet-300/70',
    iconActiveClass: 'text-violet-200',
    activeGlow: 'shadow-[0_0_16px_rgba(167,139,250,0.45)]',
  },
  instruments: {
    bgClass: 'bg-sky-500/[0.08]',
    borderClass: 'border-sky-400/20',
    iconInactiveClass: 'text-sky-300/70',
    iconActiveClass: 'text-sky-200',
    activeGlow: 'shadow-[0_0_16px_rgba(125,211,252,0.45)]',
  },
}

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  nature: 'Nature',
  environments: 'Environments',
  spiritual: 'Spiritual',
  instruments: 'Instruments',
}
