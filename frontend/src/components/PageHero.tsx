import { type ReactNode } from 'react'
import { HeadingDivider } from '@/components/HeadingDivider'
import { GRADIENT_TEXT_STYLE, renderWithScriptAccent } from '@/constants/gradients'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/utils'

// Matches Tailwind's dashboard-dark token
const DASHBOARD_DARK_HEX = '#0f0a1e'

export const ATMOSPHERIC_HERO_BG = {
  backgroundColor: DASHBOARD_DARK_HEX,
  backgroundImage:
    'radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)',
} as const

interface PageHeroProps {
  title: string
  subtitle?: string
  showDivider?: boolean
  scriptWord?: string
  children?: ReactNode
}

export function PageHero({ title, subtitle, showDivider, scriptWord, children }: PageHeroProps) {
  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()

  return (
    <section
      aria-labelledby="page-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
      style={ATMOSPHERIC_HERO_BG}
    >
      <h1
        ref={showDivider ? headingRef : undefined}
        id="page-hero-heading"
        className={cn(
          'px-1 sm:px-2 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl pb-2',
          showDivider ? 'inline-block' : 'mb-3'
        )}
        style={GRADIENT_TEXT_STYLE}
      >
        {renderWithScriptAccent(title, scriptWord)}
      </h1>
      {showDivider && (
        <div className="mt-1 flex justify-center">
          <HeadingDivider width={headingWidth} />
        </div>
      )}
      {subtitle && (
        <p className="mx-auto max-w-xl font-serif italic text-base text-white/60 sm:text-lg">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
