import type { ReactNode } from 'react'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

interface PrayerWallHeroProps {
  /** CTA button rendered below the subtitle */
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1 id="prayer-wall-heading" className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2" style={GRADIENT_TEXT_STYLE}>
        Prayer <span className="font-script">Wall</span>
      </h1>
      <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
        You&apos;re not alone.
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
