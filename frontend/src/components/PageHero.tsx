import { type ReactNode } from 'react'
import { HeadingDivider } from '@/components/HeadingDivider'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/utils'

const HERO_BG_STYLE = {
  backgroundImage:
    'linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)',
} as const

interface PageHeroProps {
  title: string
  subtitle?: string
  showDivider?: boolean
  children?: ReactNode
}

export function PageHero({ title, subtitle, showDivider, children }: PageHeroProps) {
  const { ref: headingRef, width: headingWidth } = useElementWidth<HTMLHeadingElement>()

  return (
    <section
      aria-labelledby="page-hero-heading"
      className="relative flex w-full flex-col items-center px-4 pt-32 pb-16 text-center antialiased sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24"
      style={HERO_BG_STYLE}
    >
      <h1
        ref={showDivider ? headingRef : undefined}
        id="page-hero-heading"
        className={cn(
          'font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl',
          showDivider ? 'inline-block' : 'mb-3'
        )}
      >
        {title}
      </h1>
      {showDivider && (
        <div className="mt-1 flex justify-center">
          <HeadingDivider width={headingWidth} />
        </div>
      )}
      {subtitle && (
        <p className="mx-auto max-w-xl font-sans text-base text-white/85 sm:text-lg lg:text-xl">
          {subtitle}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </section>
  )
}
