import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
        <Button variant="subtle" size="sm" onClick={onClear} className="mt-3">
          Clear search
        </Button>
      </FeatureEmptyState>
    </div>
  )
}
