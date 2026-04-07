import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1
        id="bible-hero-heading"
        className="px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
        style={GRADIENT_TEXT_STYLE}
      >
        <span className="block">The Word of God</span>
        <span className="block mt-1">Open to You</span>
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-base text-white/60 sm:text-lg">
        No account needed. Free forever. The World English Bible, always here for you.
      </p>
    </section>
  )
}
