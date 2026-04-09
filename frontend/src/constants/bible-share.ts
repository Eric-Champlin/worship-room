import type { ShareFormat, ShareFormatDimensions } from '@/types/bible-share'
import type { HighlightColor } from '@/types/bible'

export const SHARE_FORMATS: Record<ShareFormat, ShareFormatDimensions> = {
  square: {
    canvasWidth: 2160,
    canvasHeight: 2160,
    exportWidth: 1080,
    exportHeight: 1080,
    label: 'Square',
    hint: 'Instagram, Facebook',
  },
  story: {
    canvasWidth: 2160,
    canvasHeight: 3840,
    exportWidth: 1080,
    exportHeight: 1920,
    label: 'Story',
    hint: 'Stories, Reels',
  },
  portrait: {
    canvasWidth: 2160,
    canvasHeight: 2700,
    exportWidth: 1080,
    exportHeight: 1350,
    label: 'Portrait',
    hint: 'Instagram Post',
  },
  wide: {
    canvasWidth: 3840,
    canvasHeight: 2160,
    exportWidth: 1920,
    exportHeight: 1080,
    label: 'Wide',
    hint: 'Twitter/X, Desktop',
  },
}

export const SHARE_FORMAT_IDS: ShareFormat[] = ['square', 'story', 'portrait', 'wide']

/** Orb hue-shift colors for highlight tinting on share cards */
export const HIGHLIGHT_ORB_COLORS: Record<HighlightColor, string> = {
  peace: 'rgba(125, 211, 252, 0.35)',
  conviction: 'rgba(251, 146, 60, 0.35)',
  joy: 'rgba(253, 224, 71, 0.35)',
  struggle: 'rgba(196, 181, 253, 0.35)',
  promise: 'rgba(110, 231, 183, 0.35)',
}

export const LONG_PASSAGE_THRESHOLD = 800
