import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1 id="bible-hero-heading" className="px-1 sm:px-2">
        <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
          The Word of God
        </span>
        <span
          className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          open to you
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
        No account needed. Free forever. The World English Bible, always here for you.
      </p>
    </section>
  )
}
