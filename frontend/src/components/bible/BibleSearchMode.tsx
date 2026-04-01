import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { escapeRegex, useBibleSearch } from '@/hooks/useBibleSearch'
import { useStaggeredEntrance } from '@/hooks/useStaggeredEntrance'

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>

  const escaped = escapeRegex(query)
  const splitRegex = new RegExp(`(${escaped})`, 'gi')
  const testRegex = new RegExp(`^${escaped}$`, 'i')
  const parts = text.split(splitRegex)

  return (
    <>
      {parts.map((part, i) =>
        testRegex.test(part) ? (
          <mark
            key={i}
            className="rounded bg-primary/20 px-0.5 font-semibold text-white"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export function BibleSearchMode() {
  const { query, setQuery, results, isSearching, isLoadingBooks } =
    useBibleSearch()
  const { containerRef: searchResultsRef, getStaggerProps: getSearchStaggerProps } =
    useStaggeredEntrance({ staggerDelay: 50, itemCount: results.length })

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
          placeholder="Search the Bible..."
          aria-label="Search the Bible"
          aria-describedby="bible-search-status"
          className="w-full rounded-xl border border-glow-cyan/30 bg-white/[0.06] px-4 py-3 text-white placeholder-white/50 outline-none transition-colors motion-safe:animate-glow-pulse focus:border-primary focus:ring-2 focus:ring-primary/50"
        />
        <p className="mt-2 text-center text-sm text-white/60">
          Searching all 66 books of the Bible
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        {query.length === 0 && (
          <p className="text-center text-white/50">
            Type to search across Scripture
          </p>
        )}

        {query.length === 1 && (
          <p className="text-center text-white/50">
            Type at least 2 characters to search
          </p>
        )}

        <div id="bible-search-status" aria-live="polite" aria-atomic="true">
        {query.length >= 2 && (isSearching || isLoadingBooks) && (
          <p className="text-center text-white/50">Searching...</p>
        )}

        {query.length >= 2 &&
          !isSearching &&
          !isLoadingBooks &&
          results.length === 0 && (
            <p className="text-center text-white/50">
              No verses found matching &ldquo;{query}&rdquo;. Try different
              words or check spelling.
            </p>
          )}
        </div>

        {results.length > 0 && (
          <div className="flex flex-col gap-4" ref={searchResultsRef}>
            <p className="text-sm text-white/60" aria-live="polite">
              {results.length >= 100
                ? '100+ results found (showing first 100)'
                : `${results.length} result${results.length === 1 ? '' : 's'} found`}
            </p>
            {results.map((result, i) => {
              const stagger = getSearchStaggerProps(i)
              return (
              <Link
                key={`${result.bookSlug}-${result.chapter}-${result.verseNumber}-${i}`}
                to={`/bible/${result.bookSlug}/${result.chapter}#verse-${result.verseNumber}`}
                className={cn('block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10', stagger.className)}
                style={stagger.style}
              >
                <h3 className="font-semibold text-white">
                  {result.bookName} {result.chapter}:{result.verseNumber}
                </h3>
                {result.contextBefore && (
                  <p className="mt-2 text-sm text-white/60">
                    {result.contextBefore}
                  </p>
                )}
                <p className="mt-1 font-serif text-white/90">
                  <HighlightedText text={result.verseText} query={query} />
                </p>
                {result.contextAfter && (
                  <p className="mt-1 text-sm text-white/60">
                    {result.contextAfter}
                  </p>
                )}
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
