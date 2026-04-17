import { Link, useNavigate } from 'react-router-dom'

import { useBibleSearch } from '@/hooks/useBibleSearch'
import { parseReference } from '@/lib/search'
import { stem } from '@/lib/search/tokenizer'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const EXAMPLE_CHIPS = ['anxiety', 'rest', 'forgiveness', 'courage', 'hope', 'fear'] as const

function HighlightedTokens({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>

  const tokenSet = new Set(tokens)

  // Split text into words (preserving whitespace and punctuation for reconstruction)
  const parts = text.split(/(\s+)/)

  return (
    <>
      {parts.map((part, i) => {
        // Whitespace — render as-is
        if (/^\s+$/.test(part)) return <span key={i}>{part}</span>

        // Extract the word (strip punctuation for matching)
        const cleaned = part.toLowerCase().replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '')
        // Strip possessive for matching
        const forMatch = cleaned.endsWith("'s") ? cleaned.slice(0, -2) : cleaned
        const stemmed = stem(forMatch)

        if (tokenSet.has(stemmed) || tokenSet.has(forMatch)) {
          return (
            <mark
              key={i}
              className="rounded bg-primary/20 px-0.5 font-semibold text-white"
            >
              {part}
            </mark>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function SearchSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading search results</span>
      {[80, 60, 90, 70].map((width, i) => (
        <div key={i} className="motion-safe:animate-pulse space-y-2">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-4 rounded bg-white/10" style={{ width: `${width}%` }} />
          <div className="h-4 rounded bg-white/10" style={{ width: `${width - 20}%` }} />
        </div>
      ))}
    </div>
  )
}

interface BibleSearchModeProps {
  query?: string
  onQueryChange?: (query: string) => void
}

export function BibleSearchMode({ query: controlledQuery, onQueryChange }: BibleSearchModeProps = {}) {
  const {
    query,
    setQuery,
    results,
    isSearching,
    isLoadingIndex,
    hasMore,
    totalResults,
    loadMore,
    error,
  } = useBibleSearch({ controlledQuery, onQueryChange })

  const navigate = useNavigate()
  const isLoading = isSearching || isLoadingIndex

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const trimmed = query.trim()
    if (!trimmed) return

    const ref = parseReference(trimmed)
    if (ref) {
      e.preventDefault()
      const verseSuffix = ref.verse !== undefined ? `?verse=${ref.verse}` : ''
      navigate(`/bible/${ref.book}/${ref.chapter}${verseSuffix}`)
    }
  }

  return (
    <div className="mt-6">
      <div className="mx-auto max-w-2xl">
        <label htmlFor="bible-search-input" className="sr-only">
          Search the Bible
        </label>
        <input
          id="bible-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search verses or go to a passage (e.g., John 3:16)"
          aria-label="Search the Bible"
          aria-describedby="bible-search-hint bible-search-status"
          className="min-h-[44px] w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-white placeholder:text-white/50 transition-colors focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <p className="mt-2 text-center text-sm text-white/60">
          Searching all 66 books of the Bible
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        {/* Empty-query state: prompt + example chips */}
        {query.length === 0 && (
          <div className="space-y-4 text-center">
            <p className="text-white/50">
              Search the Bible for any word, phrase, or theme
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuery(chip)}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/15"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Minimum characters hint */}
        {query.length === 1 && (
          <p id="bible-search-hint" className="text-center text-white/50">
            Type at least 2 characters to search
          </p>
        )}

        {/* Status region for screen readers */}
        <div id="bible-search-status" aria-live="polite" aria-atomic="true">
          {query.length >= 2 && isLoading && !results.length && (
            <p className="sr-only">Searching...</p>
          )}

          {query.length >= 2 && !isLoading && !error && results.length === 0 && (
            <p className="text-center text-white/50">
              No verses found for &ldquo;{query}&rdquo;. Try a different word or phrase.
            </p>
          )}

          {error && (
            <p className="text-center text-white/50">
              {error}
            </p>
          )}
        </div>

        {/* Loading skeleton */}
        {query.length >= 2 && isLoading && !results.length && (
          <SearchSkeleton />
        )}

        {/* Results */}
        <ErrorBoundary
          fallback={
            <p className="py-6 text-center text-sm text-white/50">
              Search unavailable right now — try refreshing the page.
            </p>
          }
        >
        {results.length > 0 && (
          <div>
            {/* Result count */}
            <p className="mb-4 text-sm text-white/60" aria-live="polite">
              {totalResults > results.length
                ? `${totalResults} verses found (showing ${results.length})`
                : `${totalResults} verse${totalResults === 1 ? '' : 's'} found`}
            </p>

            {/* Result list */}
            <div>
              {results.map((result, i) => (
                <Link
                  key={`${result.bookSlug}-${result.chapter}-${result.verseNumber}-${i}`}
                  to={`/bible/${result.bookSlug}/${result.chapter}?verse=${result.verseNumber}`}
                  className="block border-b border-white/10 py-4 transition-colors hover:bg-white/[0.03]"
                >
                  <p className="text-sm font-medium text-white/70">
                    {result.bookName} {result.chapter}:{result.verseNumber}
                  </p>
                  <p className="mt-1 leading-relaxed text-white">
                    <HighlightedTokens
                      text={result.verseText}
                      tokens={result.matchedTokens}
                    />
                  </p>
                </Link>
              ))}
            </div>

            {/* Load more button */}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={isSearching}
                className="mt-6 min-h-[44px] w-full rounded-lg border border-white/20 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {isSearching ? 'Loading...' : 'Show more results'}
              </button>
            )}
          </div>
        )}
        </ErrorBoundary>
      </div>
    </div>
  )
}
