import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function BibleHero() {
  return (
    <section
      aria-labelledby="bible-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-28 pb-12 text-center antialiased sm:pt-32 sm:pb-14 lg:pt-32"
    >
      <h1 id="bible-hero-heading" className="px-1 sm:px-2">
        <span className="block text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
          Your
        </span>
        <span
          className="block text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mt-1 pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          Study Bible
        </span>
      </h1>
    </section>
  )
}
