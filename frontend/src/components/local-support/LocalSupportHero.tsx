import type { ReactNode } from 'react'
import { GlowBackground } from '@/components/homepage/GlowBackground'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

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
    <GlowBackground variant="center">
      <section
        aria-labelledby={headingId}
        className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      >
        <h1
          id={headingId}
          className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2"
          style={GRADIENT_TEXT_STYLE}
        >
          {title}
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-white sm:text-lg">
          {subtitle}
        </p>
        {extraContent && <div className="mt-4">{extraContent}</div>}
        {action && <div className="mt-6">{action}</div>}
      </section>
    </GlowBackground>
  )
}
