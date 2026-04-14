/** Canonical animation duration tokens (ms). All standard UI animations must use these. */
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
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
