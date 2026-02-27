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
        backgroundImage: [
          'radial-gradient(ellipse 100% 80% at 50% 0%, #3B0764 0%, transparent 60%)',
          'linear-gradient(to bottom, #0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)',
        ].join(', '),
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
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
