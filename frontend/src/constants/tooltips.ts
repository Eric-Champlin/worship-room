export const TOOLTIP_DEFINITIONS = {
  'dashboard-quick-actions': {
    id: 'dashboard-quick-actions',
    message: 'Start here — pick any practice to begin your day',
    position: 'top' as const,
  },
  'daily-hub-tabs': {
    id: 'daily-hub-tabs',
    message: 'Switch between Pray, Journal, and Meditate here',
    position: 'bottom' as const,
  },
  'prayer-wall-composer': {
    id: 'prayer-wall-composer',
    message: "Share what's on your heart with the community",
    position: 'bottom' as const,
  },
  'music-ambient-tab': {
    id: 'music-ambient-tab',
    message: 'Mix ambient sounds to create your perfect atmosphere',
    position: 'bottom' as const,
  },
} as const

export type TooltipId = keyof typeof TOOLTIP_DEFINITIONS
