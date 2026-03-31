import type { ReactNode } from 'react'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { GRADIENT_TEXT_STYLE, renderWithScriptAccent } from '@/constants/gradients'

interface LocalSupportHeroProps {
  headingId: string
  title: string
  subtitle: string
  scriptWord?: string
  extraContent?: ReactNode
  action?: ReactNode
}

export function LocalSupportHero({
  headingId,
  title,
  subtitle,
  scriptWord,
  extraContent,
  action,
}: LocalSupportHeroProps) {
  return (
    <section
      aria-labelledby={headingId}
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1
        id={headingId}
        className="mb-3 px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl"
        style={GRADIENT_TEXT_STYLE}
      >
        {renderWithScriptAccent(title, scriptWord)}
      </h1>
      <p className="mx-auto max-w-2xl font-serif italic text-base leading-relaxed text-white/60 sm:text-lg">
        {subtitle}
      </p>
      {extraContent && <div className="mt-4">{extraContent}</div>}
      {action && <div className="mt-6">{action}</div>}
    </section>
  )
}
