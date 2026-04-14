import type { HighlightColor } from '@/types/bible'

export type ShareFormat = 'square' | 'story' | 'portrait' | 'wide'

export interface ShareFormatDimensions {
  /** Canvas render width (2x for Retina) */
  canvasWidth: number
  /** Canvas render height (2x for Retina) */
  canvasHeight: number
  /** Export width (1x) */
  exportWidth: number
  /** Export height (1x) */
  exportHeight: number
  label: string
  hint: string
}

export interface ShareCardOptions {
  format: ShareFormat
  includeReference: boolean
  highlightColor: HighlightColor | null
}
