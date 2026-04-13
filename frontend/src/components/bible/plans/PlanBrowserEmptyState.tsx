import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

type EmptyVariant = 'no-manifest' | 'filtered-out' | 'all-started'

interface PlanBrowserEmptyStateProps {
  variant: EmptyVariant
  onClearFilters?: () => void
}

export function PlanBrowserEmptyState({ variant, onClearFilters }: PlanBrowserEmptyStateProps) {
  if (variant === 'all-started') {
    return (
      <p className="col-span-full text-sm text-white/50">
        You've started every plan. Finish one to unlock restart from the detail page.
      </p>
    )
  }

  if (variant === 'filtered-out') {
    return (
      <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-white">No plans match these filters</h2>
        <p className="text-white/50">Try a different combination or clear your filters.</p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark active:scale-[0.98]"
          >
            Clear filters
          </button>
        )}
      </div>
    )
  }

  // no-manifest
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <BookOpen className="h-12 w-12 text-white/30" />
      <h2 className="text-xl font-semibold text-white">No plans available yet</h2>
      <p className="text-white/50">Check back soon — new reading plans are on the way.</p>
      <Link
        to="/bible"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
      >
        Open Bible
      </Link>
    </div>
  )
}
