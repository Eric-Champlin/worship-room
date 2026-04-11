import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

interface UseSearchQueryOptions {
  /** Debounce ms for URL writes (default: 250) */
  debounceMs?: number
}

interface UseSearchQueryReturn {
  query: string
  setQuery: (query: string) => void
}

const DEFAULT_DEBOUNCE_MS = 250

/**
 * BB-38: Reads and writes the ?q= query parameter for Bible search.
 *
 * Debounced writes: keystrokes update local React state immediately, but the
 * URL is only updated after `debounceMs` of no further keystrokes. This keeps
 * the history stack from accumulating one entry per letter typed.
 *
 * Reads: the URL value is the source of truth. If the URL changes externally
 * (browser back/forward), local state follows.
 *
 * Empty string clears the parameter entirely (no `?q=` in the URL).
 */
export function useSearchQuery(options: UseSearchQueryOptions = {}): UseSearchQueryReturn {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''

  const [localQuery, setLocalQuery] = useState(urlQuery)
  const lastWrittenRef = useRef(urlQuery)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // External URL changes (browser back/forward) overwrite local state
  useEffect(() => {
    if (urlQuery !== lastWrittenRef.current) {
      setLocalQuery(urlQuery)
      lastWrittenRef.current = urlQuery
    }
  }, [urlQuery])

  const setQuery = useCallback(
    (q: string) => {
      setLocalQuery(q)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        lastWrittenRef.current = q
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (q === '') {
              next.delete('q')
            } else {
              next.set('q', q)
            }
            return next
          },
          { replace: false },
        )
      }, debounceMs)
    },
    [debounceMs, setSearchParams],
  )

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  return { query: localQuery, setQuery }
}
