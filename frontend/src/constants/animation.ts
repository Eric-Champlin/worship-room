/** Canonical animation duration tokens (ms). All standard UI animations must use these. */
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
  pulse: 300, // PrayerCard pulse animation cleanup (matches CSS pulse keyframe exactly)
  ceremony: 600, // InteractionBar whisper-pulse coordination (paired with sound effect timing)
} as const

/** Canonical animation easing tokens. Match Material Design standard curves. */
export const ANIMATION_EASINGS = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const

export type AnimationDuration = keyof typeof ANIMATION_DURATIONS
export type AnimationEasing = keyof typeof ANIMATION_EASINGS
