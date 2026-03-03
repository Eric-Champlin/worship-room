import { AlertCircle, MapPin, SearchX } from 'lucide-react'
import type { LocalSupportCategory } from '@/types/local-support'

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
    <div className="flex flex-col items-center py-12 text-center">
      <MapPin size={48} className="mb-4 text-text-light" aria-hidden="true" />
      <p className="max-w-sm text-base text-text-light">
        Enter your location to find {categoryNoun(category)} near you.
      </p>
    </div>
  )
}

// --- No results found ---

interface NoResultsProps {
  radius: number
  category: LocalSupportCategory
}

export function NoResults({ radius, category }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <SearchX size={48} className="mb-4 text-text-light" aria-hidden="true" />
      <p className="max-w-md text-base text-text-light">
        We couldn&apos;t find any {categoryNoun(category)} within {radius} miles.
        Try expanding your search radius or searching a different area.
      </p>
    </div>
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
      <p className="mb-4 max-w-md text-base text-text-light">{message}</p>
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
          className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
        >
          <div className="flex gap-4">
            <div className="hidden h-20 w-20 animate-pulse rounded-lg bg-gray-200 sm:block" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="flex gap-2">
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
            </div>
            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
