import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance'
import { JournalSearchFilter } from '@/components/daily/JournalSearchFilter'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { JournalMode, SavedJournalEntry } from '@/types/daily-experience'

const EMPTY_REFLECTING_IDS: ReadonlySet<string> = new Set()

function formatDateTime(date: Date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  const day = date.getDate()
  const year = date.getFullYear()
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayName}, ${month} ${day}, ${year} \u2014 ${time}`
}

export interface SavedEntriesListProps {
  entries: SavedJournalEntry[]
  onWriteAnother: () => void
  onReflect: (entryId: string) => void
  onSwitchTab?: (tab: 'pray' | 'journal' | 'meditate') => void
  reflectingIds?: ReadonlySet<string>
}

export function SavedEntriesList({
  entries,
  onWriteAnother,
  onReflect,
  onSwitchTab,
  reflectingIds = EMPTY_REFLECTING_IDS,
}: SavedEntriesListProps) {
  const [isDoneJournaling, setIsDoneJournaling] = useState(false)

  // Search & filter state
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<'all' | JournalMode>('all')
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest')

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchText])

  const filteredEntries = useMemo(() => {
    let result = entries

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(
        (e) =>
          e.content.toLowerCase().includes(query) ||
          (e.promptText && e.promptText.toLowerCase().includes(query)),
      )
    }

    if (modeFilter !== 'all') {
      result = result.filter((e) => e.mode === modeFilter)
    }

    if (sortDirection === 'oldest') {
      result = [...result].reverse()
    }

    return result
  }, [entries, debouncedSearch, modeFilter, sortDirection])

  const clearFilters = () => {
    setSearchText('')
    setDebouncedSearch('')
    setModeFilter('all')
    setSortDirection('newest')
  }

  const { containerRef: entryListRef, getStaggerProps: getEntryStaggerProps } =
    useStaggeredEntrance({ staggerDelay: 50, itemCount: filteredEntries.length })

  return (
    <section aria-labelledby="saved-entries-heading" className="space-y-6">
      <h3 id="saved-entries-heading" className="sr-only">
        Saved Entries
      </h3>

      {/* Write Another + Done Journaling */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onWriteAnother}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Write another
        </button>
        {!isDoneJournaling && (
          <button
            type="button"
            onClick={() => setIsDoneJournaling(true)}
            className="text-sm text-white/50 underline transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Done journaling
          </button>
        )}
      </div>

      {/* Done Journaling CTAs */}
      {isDoneJournaling && (
        <div className="motion-safe:animate-fade-in rounded-lg bg-white/[0.06] p-4">
          <p className="mb-3 text-sm font-medium text-white">
            Beautiful time of reflection. Where to next?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => onSwitchTab?.('meditate')}
              className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Continue to Meditate &rarr;
            </button>
            <Link
              to="/prayer-wall"
              className="text-sm text-primary transition-colors hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Visit the Prayer Wall
            </Link>
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      {entries.length >= 2 && (
        <JournalSearchFilter
          searchText={searchText}
          onSearchChange={setSearchText}
          onClearSearch={() => { setSearchText(''); setDebouncedSearch('') }}
          modeFilter={modeFilter}
          onModeFilterChange={setModeFilter}
          sortDirection={sortDirection}
          onSortDirectionChange={() => setSortDirection((d) => d === 'newest' ? 'oldest' : 'newest')}
        />
      )}

      {/* Empty filter state */}
      {filteredEntries.length === 0 && entries.length >= 2 && (
        <div role="status">
          <FeatureEmptyState
            icon={SearchX}
            heading="No matching entries"
            description="Try adjusting your search or filters."
            ctaLabel="Clear filters"
            onCtaClick={clearFilters}
            compact
          />
        </div>
      )}

      {/* Entry Cards */}
      <div ref={entryListRef} className="space-y-6">
      {filteredEntries.map((entry, entryIndex) => {
        const stagger = getEntryStaggerProps(entryIndex)
        return (
        <div
          key={entry.id}
          className={stagger.className}
          style={stagger.style}
        >
          <FrostedCard as="article" variant="default" className="p-4">
            <p className="mb-2 text-xs text-white/60">
              {formatDateTime(new Date(entry.timestamp))}
              {entry.mode === 'guided' && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                  <span className="sr-only">Mode: </span>Guided
                </span>
              )}
            </p>
            {entry.promptText && (
              <p className="mb-2 text-xs italic text-white/60">
                Prompt: {entry.promptText}
              </p>
            )}
            <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-white/80">
              {entry.content}
            </p>

            {entry.reflection ? (
              <FrostedCard as="div" variant="subdued" className="mt-3 p-3">
                <p className="mb-1 text-xs font-medium text-primary">
                  Reflection
                </p>
                <p className="text-sm leading-relaxed text-white/80">
                  {entry.reflection}
                </p>
              </FrostedCard>
            ) : reflectingIds.has(entry.id) ? (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-sm text-white/70"
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-primary motion-reduce:animate-none"
                />
                Reflecting on your words&hellip;
              </div>
            ) : (
              <Button
                variant="subtle"
                size="sm"
                type="button"
                onClick={() => onReflect(entry.id)}
                className="mt-3"
                aria-label={`Reflect on entry from ${formatDateTime(new Date(entry.timestamp))}`}
              >
                Reflect on my entry
              </Button>
            )}
          </FrostedCard>
        </div>
        )
      })}
      </div>
    </section>
  )
}
