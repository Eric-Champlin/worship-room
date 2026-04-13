import { ArrowUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JournalMode } from '@/types/daily-experience'

export interface JournalSearchFilterProps {
  searchText: string
  onSearchChange: (text: string) => void
  onClearSearch: () => void
  modeFilter: 'all' | JournalMode
  onModeFilterChange: (mode: 'all' | JournalMode) => void
  sortDirection: 'newest' | 'oldest'
  onSortDirectionChange: () => void
}

export function JournalSearchFilter({
  searchText,
  onSearchChange,
  onClearSearch,
  modeFilter,
  onModeFilterChange,
  sortDirection,
  onSortDirectionChange,
}: JournalSearchFilterProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Search input */}
        <div className="relative flex-1 sm:max-w-none lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden="true" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search your entries..."
            aria-label="Search your entries"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-9 pr-8 text-sm text-white placeholder:text-white/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
          />
          {searchText && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mode pills + Sort toggle row */}
        <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
          {/* Mode filter pills */}
          <div role="group" aria-label="Filter by journal mode" className="flex gap-1.5">
            {(['all', 'guided', 'free'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeFilterChange(m)}
                aria-pressed={modeFilter === m}
                className={cn(
                  'min-h-[44px] rounded-full px-3 py-1 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  modeFilter === m
                    ? 'bg-primary/20 text-primary'
                    : 'bg-white/10 text-white/70 hover:bg-white/15',
                )}
              >
                {m === 'all' ? 'All' : m === 'guided' ? 'Guided' : 'Free Write'}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <button
            type="button"
            onClick={onSortDirectionChange}
            aria-label={`Sort order: ${sortDirection === 'newest' ? 'newest first' : 'oldest first'}. Click to change.`}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortDirection === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      </div>
    </div>
  )
}
