import { SearchX } from 'lucide-react'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'

interface EmptySearchResultsProps {
  query: string
  onClear: () => void
}

export function EmptySearchResults({ query, onClear }: EmptySearchResultsProps) {
  return (
    <div className="py-16">
      <FeatureEmptyState
        icon={SearchX}
        heading={`No matches for "${query}"`}
        description="Try a different word, or clear the search to see everything."
        compact
      >
        <button
          type="button"
          onClick={onClear}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Clear search
        </button>
      </FeatureEmptyState>
    </div>
  )
}
