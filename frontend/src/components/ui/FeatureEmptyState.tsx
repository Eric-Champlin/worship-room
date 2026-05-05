import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface FeatureEmptyStateProps {
  icon: LucideIcon
  /** Override the default `text-white/30` icon color (e.g., `text-white/40` for the Local Support saved-tab empty state per Spec 5 Change 12). Sizing classes are preserved. */
  iconClassName?: string
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
  iconClassName,
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
        className={cn('mb-3 h-10 w-10 sm:h-12 sm:w-12', iconClassName ?? 'text-white/30')}
        aria-hidden="true"
      />
      <h3 className="text-lg font-bold text-white/70">{heading}</h3>
      <p className="mt-1 text-sm text-white/60">{description}</p>
      {children}
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
