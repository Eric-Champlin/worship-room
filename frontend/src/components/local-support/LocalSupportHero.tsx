import type { ReactNode } from 'react'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import { CinematicHeroBackground } from '@/components/CinematicHeroBackground'

interface LocalSupportHeroProps {
  headingId: string
  title: string
  subtitle: string
  extraContent?: ReactNode
  action?: ReactNode
}

export function LocalSupportHero({
  headingId,
  title,
  subtitle,
  extraContent,
  action,
}: LocalSupportHeroProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex w-full flex-col items-center px-4 pt-[145px] pb-12 text-center antialiased"
    >
      <CinematicHeroBackground />
      <h1
        id={headingId}
        className="relative z-10 mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
        style={GRADIENT_TEXT_STYLE}
      >
        {title}
      </h1>
      <p className="relative z-10 mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
        {subtitle}
      </p>
      {extraContent && <div className="relative z-10 mt-4">{extraContent}</div>}
      {action && <div className="relative z-10 mt-6">{action}</div>}
    </section>
  )
}
