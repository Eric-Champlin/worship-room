import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface MusicHeroProps {
  /** Defaults to 'Music'. */
  title?: string
  /** Defaults to canonical Music subtitle. */
  subtitle?: string
}

export function MusicHero({
  title = 'Music',
  subtitle = "Worship, rest, and find peace in God's presence.",
}: MusicHeroProps = {}) {
  return (
    <section
      aria-labelledby="page-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id="page-hero-heading"
        className="relative z-10 mb-3 px-1 sm:px-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        {title}
      </h1>
      <p className="relative z-10 mx-auto max-w-xl text-base leading-relaxed text-white sm:text-lg">
        {subtitle}
      </p>
    </section>
  )
}
