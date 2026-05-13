import type { ReactNode } from 'react'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface PrayerWallHeroProps {
  /** CTA button rendered below the subtitle */
  action?: ReactNode
  /**
   * Spec 6.3 — Day/night subtitle variant. Default falls back to the day copy
   * (Plan-Time Divergence #2: replaces the prior "You're not alone." string).
   */
  subtitle?: string
  /**
   * Spec 6.3 — NightWatchChip rendered above the action when night mode is
   * active. Consumer (PrayerWall.tsx) is responsible for mounting/unmounting
   * the chip with the night-active state.
   */
  nightWatchChip?: ReactNode
  /**
   * Spec 6.4 — WatchIndicator chip rendered alongside nightWatchChip when
   * Watch is active. Renders side-by-side with NightWatchChip if both are
   * present (Plan-Time Divergence #3).
   */
  watchIndicator?: ReactNode
}

export function PrayerWallHero({
  action,
  subtitle = 'What weighs on you today?',
  nightWatchChip,
  watchIndicator,
}: PrayerWallHeroProps) {
  const showChipsRow = nightWatchChip || watchIndicator
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id="prayer-wall-heading"
        data-night-hero-heading
        className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        Prayer Wall
      </h1>
      <p className="text-white-night-aware relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        {subtitle}
      </p>
      {showChipsRow && (
        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-2">
          {nightWatchChip}
          {watchIndicator}
        </div>
      )}
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </section>
  )
}
