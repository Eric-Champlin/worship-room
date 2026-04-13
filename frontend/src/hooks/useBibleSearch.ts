import { useCallback, useEffect, useRef, useState } from 'react'

import { BIBLE_PROGRESS_KEY } from '@/constants/bible'
import {
  loadSearchIndex,
  searchBible,
  loadVerseTexts,
  applyProximityBonus,
  tokenize,
} from '@/lib/search'
import type { BibleSearchResult } from '@/types/bible'
import type { VerseRef } from '@/lib/search/types'

export interface UseBibleSearchOptions {
  controlledQuery?: string
  onQueryChange?: (query: string) => void
}

export function useBibleSearch(options: UseBibleSearchOptions = {}): {
  query: string
  setQuery: (q: string) => void
  results: BibleSearchResult[]
  isSearching: boolean
  isLoadingIndex: boolean
  hasMore: boolean
  totalResults: number
  loadMore: () => void
  error: string | null
} {
  const { controlledQuery, onQueryChange } = options
  const isControlled = controlledQuery !== undefined

  const [internalQuery, setInternalQuery] = useState('')
  const query = isControlled ? controlledQuery : internalQuery

  const setQuery = useCallback(
    (q: string) => {
      if (isControlled) {
        onQueryChange?.(q)
      } else {
        setInternalQuery(q)
      }
    },
    [isControlled, onQueryChange],
  )

  const [results, setResults] = useState<BibleSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingIndex, setIsLoadingIndex] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const indexLoadedRef = useRef(false)

  const getRecentBooks = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
      if (!raw) return []
      const progress = JSON.parse(raw) as Record<string, number[]>
      return Object.keys(progress).filter((k) => progress[k].length > 0)
    } catch {
      return []
    }
  }, [])

  const performSearch = useCallback(
    async (q: string, pageNum: number, append: boolean) => {
      if (q.length < 2) {
        if (!append) {
          setResults([])
          setTotalResults(0)
        }
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setError(null)

      try {
        // Ensure index is loaded
        if (!indexLoadedRef.current) {
          setIsLoadingIndex(true)
          await loadSearchIndex()
          indexLoadedRef.current = true
          setIsLoadingIndex(false)
        }

        const recentBooks = getRecentBooks()
        const { results: searchResults, total } = searchBible(q, {
          pageSize: 50,
          page: pageNum,
          recentBooks,
        })

        // Load verse texts for this page
        const refs: VerseRef[] = searchResults.map((r) => [
          r.bookSlug,
          r.chapter,
          r.verse,
        ])
        const textMap = await loadVerseTexts(refs)

        // Hydrate results with text
        const hydrated: BibleSearchResult[] = searchResults.map((r) => ({
          bookName: r.bookName,
          bookSlug: r.bookSlug,
          chapter: r.chapter,
          verseNumber: r.verse,
          verseText: textMap.get(`${r.bookSlug}:${r.chapter}:${r.verse}`) ?? '',
          score: r.score,
          matchedTokens: r.matchedTokens,
        }))

        // Apply proximity bonus now that text is available
        const queryTokens = tokenize(q)
        // Use the SearchResult type for proximity (convert temporarily)
        const forProximity = hydrated.map((h) => ({
          ...h,
          verse: h.verseNumber,
          text: h.verseText,
        }))
        applyProximityBonus(forProximity, queryTokens)

        // Copy updated scores back
        for (let i = 0; i < hydrated.length; i++) {
          hydrated[i].score = forProximity[i].score
        }

        // Re-sort after proximity bonus
        hydrated.sort((a, b) => b.score - a.score)

        if (append) {
          setResults((prev) => [...prev, ...hydrated])
        } else {
          setResults(hydrated)
        }
        setTotalResults(total)
      } catch (err) {
        setIsLoadingIndex(false)
        setError('Unable to load search. Please try again.')
      } finally {
        setIsSearching(false)
      }
    },
    [getRecentBooks],
  )

  // Debounced search on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setTotalResults(0)
      setIsSearching(false)
      setPage(0)
      return
    }

    setIsSearching(true)
    setPage(0)
    const timer = setTimeout(() => {
      performSearch(query, 0, false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const loadMore = useCallback(() => {
    const nextPage = page + 1
    setPage(nextPage)
    performSearch(query, nextPage, true)
  }, [page, query, performSearch])

  const hasMore = results.length < totalResults

  return {
    query,
    setQuery,
    results,
    isSearching,
    isLoadingIndex,
    hasMore,
    totalResults,
    loadMore,
    error,
  }
}
