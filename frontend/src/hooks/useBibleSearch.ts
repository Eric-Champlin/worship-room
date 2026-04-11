import { useCallback, useEffect, useRef, useState } from 'react'

import { BIBLE_BOOKS, BOOKS_WITH_FULL_TEXT } from '@/constants/bible'
import { loadAllBookText } from '@/data/bible'
import type { BibleChapter, BibleSearchResult } from '@/types/bible'

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function searchAllBooks(
  booksData: Map<string, BibleChapter[]>,
  query: string,
): BibleSearchResult[] {
  const escaped = escapeRegex(query)
  const regex = new RegExp(escaped, 'i')
  const results: BibleSearchResult[] = []

  for (const [bookSlug, chapters] of booksData) {
    const bookMeta = BIBLE_BOOKS.find((b) => b.slug === bookSlug)
    if (!bookMeta) continue

    for (const chapter of chapters) {
      for (let i = 0; i < chapter.verses.length; i++) {
        const verse = chapter.verses[i]
        if (!regex.test(verse.text)) continue

        results.push({
          bookName: bookMeta.name,
          bookSlug,
          chapter: chapter.chapter,
          verseNumber: verse.number,
          verseText: verse.text,
          contextBefore: i > 0 ? chapter.verses[i - 1].text : undefined,
          contextAfter:
            i < chapter.verses.length - 1
              ? chapter.verses[i + 1].text
              : undefined,
        })

        if (results.length >= 100) return results
      }
    }
  }

  return results
}

export interface UseBibleSearchOptions {
  /**
   * BB-38: when provided (even as an empty string), the hook operates in
   * "controlled" mode — the `query` return value mirrors this prop and
   * `setQuery` calls `onQueryChange` instead of updating internal state.
   * Pass `undefined` (or omit entirely) for backward-compatible uncontrolled
   * mode.
   */
  controlledQuery?: string
  /**
   * BB-38: required when `controlledQuery` is provided. Called when the
   * consumer invokes `setQuery(value)`. The caller is responsible for
   * updating its own state so the next render supplies a fresh `controlledQuery`.
   */
  onQueryChange?: (query: string) => void
}

export function useBibleSearch(options: UseBibleSearchOptions = {}): {
  query: string
  setQuery: (q: string) => void
  results: BibleSearchResult[]
  isSearching: boolean
  isLoadingBooks: boolean
  allBooksLoaded: boolean
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
  const [isLoadingBooks, setIsLoadingBooks] = useState(false)
  const [allBooksLoaded, setAllBooksLoaded] = useState(false)
  const booksDataRef = useRef<Map<string, BibleChapter[]>>(new Map())

  const ensureBooksLoaded = useCallback(async () => {
    if (allBooksLoaded) return
    setIsLoadingBooks(true)

    const slugs = Array.from(BOOKS_WITH_FULL_TEXT)
    const loadPromises = slugs.map(async (slug) => {
      if (booksDataRef.current.has(slug)) return
      const chapters = await loadAllBookText(slug)
      if (chapters.length > 0) {
        booksDataRef.current.set(slug, chapters)
      }
    })

    await Promise.all(loadPromises)
    setAllBooksLoaded(true)
    setIsLoadingBooks(false)
  }, [allBooksLoaded])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      await ensureBooksLoaded()
      const searchResults = searchAllBooks(booksDataRef.current, query)
      setResults(searchResults)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, ensureBooksLoaded])

  return {
    query,
    setQuery,
    results,
    isSearching,
    isLoadingBooks,
    allBooksLoaded,
  }
}
