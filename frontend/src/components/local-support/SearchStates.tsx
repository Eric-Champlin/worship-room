import { AlertCircle, MapPin, SearchX } from 'lucide-react'
import type { LocalSupportCategory } from '@/types/local-support'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

function categoryNoun(category: LocalSupportCategory): string {
  switch (category) {
    case 'churches':
      return 'churches'
    case 'counselors':
      return 'counselors'
    case 'celebrate-recovery':
      return 'Celebrate Recovery groups'
  }
}

// --- Search not yet performed ---

interface SearchPromptProps {
  category: LocalSupportCategory
}

export function SearchPrompt({ category }: SearchPromptProps) {
  return (
    <FeatureEmptyState
      icon={MapPin}
      heading="Find support near you"
      description={`Enter your location to find ${categoryNoun(category)} near you.`}
    />
  )
}

// --- No results found ---

interface NoResultsProps {
  radius: number
  category: LocalSupportCategory
}

export function NoResults({ radius, category }: NoResultsProps) {
  return (
    <FeatureEmptyState
      icon={SearchX}
      heading="No results found"
      description={`We couldn't find any ${categoryNoun(category)} within ${radius} miles. Try expanding your search radius or searching a different area.`}
    />
  )
}

// --- Error state ---

interface SearchErrorProps {
  message: string
  onRetry: () => void
}

export function SearchError({ message, onRetry }: SearchErrorProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <AlertCircle size={48} className="mb-4 text-danger" aria-hidden="true" />
      <p className="mb-4 max-w-md text-base text-white/60">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-lt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Try Again
      </button>
    </div>
  )
}

// --- Loading skeleton ---

export function ListingSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading results">
      <span className="sr-only">Loading results...</span>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/[0.06] p-5 sm:p-6"
        >
          <div className="flex gap-4">
            <div className="hidden h-20 w-20 motion-safe:animate-pulse rounded-lg bg-white/[0.08] sm:block" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-3/4 motion-safe:animate-pulse rounded bg-white/[0.08]" />
              <div className="h-4 w-1/2 motion-safe:animate-pulse rounded bg-white/[0.08]" />
              <div className="h-4 w-1/3 motion-safe:animate-pulse rounded bg-white/[0.08]" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex gap-2">
              <div className="h-8 w-8 motion-safe:animate-pulse rounded-lg bg-white/[0.08]" />
              <div className="h-8 w-8 motion-safe:animate-pulse rounded-lg bg-white/[0.08]" />
            </div>
            <div className="h-8 w-8 motion-safe:animate-pulse rounded-lg bg-white/[0.08]" />
          </div>
        </div>
      ))}
    </div>
  )
}
