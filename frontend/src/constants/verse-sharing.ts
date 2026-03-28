import type { ShareTemplate, ShareSize, ShareSizeDimensions } from '@/types/verse-sharing'

export const SHARE_SIZES: Record<ShareSize, ShareSizeDimensions> = {
  square: { width: 1080, height: 1080, label: 'Square', hint: 'Instagram, FB' },
  story: { width: 1080, height: 1920, label: 'Story', hint: 'Stories, TikTok' },
  wide: { width: 1200, height: 630, label: 'Wide', hint: 'Twitter/X, OG' },
}

export const SHARE_TEMPLATES: { id: ShareTemplate; name: string }[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'radiant', name: 'Radiant' },
  { id: 'nature', name: 'Nature' },
  { id: 'bold', name: 'Bold' },
]

export const DEFAULT_TEMPLATE: ShareTemplate = 'classic'
export const DEFAULT_SIZE: ShareSize = 'square'

export const SHARE_PREF_TEMPLATE_KEY = 'wr_share_last_template'
export const SHARE_PREF_SIZE_KEY = 'wr_share_last_size'
