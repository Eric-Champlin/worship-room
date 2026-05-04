import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { FrostedCard } from '@/components/homepage/FrostedCard'
import { Button } from '@/components/ui/Button'

type EmptyVariant = 'no-manifest' | 'filtered-out' | 'all-started'

interface PlanBrowserEmptyStateProps {
  variant: EmptyVariant
  onClearFilters?: () => void
}

export function PlanBrowserEmptyState({ variant, onClearFilters }: PlanBrowserEmptyStateProps) {
  if (variant === 'all-started') {
    return (
      <p className="col-span-full text-sm text-white/50">
        You&apos;ve started every plan. Finish one to unlock restart from the detail page.
      </p>
    )
  }

  if (variant === 'filtered-out') {
    return (
      <FrostedCard variant="subdued" className="col-span-full text-center p-8">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">No plans match these filters</h2>
          <p className="text-white/50">Try a different combination or clear your filters.</p>
          {onClearFilters && (
            <Button variant="subtle" size="lg" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </FrostedCard>
    )
  }

  // no-manifest
  return (
    <FrostedCard variant="subdued" className="text-center p-8">
      <div className="flex flex-col items-center gap-4">
        <BookOpen className="h-12 w-12 text-white/40" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-white">No plans available yet</h2>
        <p className="text-white/50">Check back soon — new reading plans are on the way.</p>
        <Button variant="subtle" size="lg" asChild>
          <Link to="/bible">Open Bible</Link>
        </Button>
      </div>
    </FrostedCard>
  )
}
