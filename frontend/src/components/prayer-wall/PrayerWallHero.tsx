import type { ReactNode } from 'react'

interface PrayerWallHeroProps {
  /** CTA button rendered below the subtitle */
  action?: ReactNode
}

export function PrayerWallHero({ action }: PrayerWallHeroProps) {
  return (
    <section
      aria-labelledby="prayer-wall-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-10 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40 lg:pb-14"
      style={{
        backgroundImage:
          'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #0f0a1e 100%)',
      }}
    >
      <h1 id="prayer-wall-heading" className="mb-3 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
        Prayer Wall
      </h1>
      <p className="mx-auto max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl">
        You&apos;re not alone.
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
