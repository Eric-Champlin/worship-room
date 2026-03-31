import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface FeatureEmptyStateProps {
  icon: LucideIcon
  heading: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  /** Render below the description, above the CTA */
  children?: React.ReactNode
  /** Use compact padding for dashboard widgets */
  compact?: boolean
  className?: string
}

export function FeatureEmptyState({
  icon: Icon,
  heading,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  children,
  compact = false,
  className,
}: FeatureEmptyStateProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-sm flex-col items-center px-6 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
    >
      <Icon
        className="mb-3 h-10 w-10 text-white/30 sm:h-12 sm:w-12"
        aria-hidden="true"
      />
      <h3 className="text-lg font-bold text-white/70">{heading}</h3>
      <p className="mt-1 text-sm text-white/60">{description}</p>
      {children}
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {ctaLabel} →
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          {ctaLabel} →
        </button>
      )}
    </div>
  )
}
