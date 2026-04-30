import { useEffect, useState } from 'react'
import { AUTH_INVALIDATED_EVENT } from '@/lib/api-client'
import { getLegalVersionsApi, type LegalVersions } from '@/services/api/legal-api'

interface UseLegalVersionsResult {
  versions: LegalVersions | null
  isLoading: boolean
  error: Error | null
}

// Module-level cache so multiple components don't re-fire the fetch on the
// same page load. Versions are static per release, so a single fetch per
// session is sufficient. Cleared on `wr:auth-invalidated` so a token swap
// (e.g., logout → register → login as a different user) re-fetches.
let cachedVersions: LegalVersions | null = null
let inflightFetch: Promise<LegalVersions> | null = null

function fetchOnce(): Promise<LegalVersions> {
  if (inflightFetch) return inflightFetch
  if (cachedVersions) return Promise.resolve(cachedVersions)
  inflightFetch = getLegalVersionsApi()
    .then((v) => {
      cachedVersions = v
      inflightFetch = null
      return v
    })
    .catch((err) => {
      inflightFetch = null
      throw err
    })
  return inflightFetch
}

function invalidateCache() {
  cachedVersions = null
  inflightFetch = null
}

/**
 * Spec 1.10f. Returns the current canonical legal-document versions from
 * `GET /api/v1/legal/versions`. Single-fetch + module cache + refetch on
 * `wr:auth-invalidated`. Never throws — consumers branch on `error`.
 */
export function useLegalVersions(): UseLegalVersionsResult {
  const [versions, setVersions] = useState<LegalVersions | null>(cachedVersions)
  const [isLoading, setIsLoading] = useState<boolean>(!cachedVersions)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    function load() {
      setIsLoading(true)
      setError(null)
      fetchOnce()
        .then((v) => {
          if (cancelled) return
          setVersions(v)
          setIsLoading(false)
        })
        .catch((err) => {
          if (cancelled) return
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        })
    }

    load()

    function handleAuthInvalidated() {
      invalidateCache()
      load()
    }
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated)

    return () => {
      cancelled = true
      window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated)
    }
  }, [])

  return { versions, isLoading, error }
}

/**
 * Test-only — resets the module-level cache. Consumers in production should
 * never call this; use it from `beforeEach` in tests to isolate runs.
 */
export function __resetLegalVersionsCache() {
  cachedVersions = null
  inflightFetch = null
}
