import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseVerseContextFromUrl, hydrateVerseContext } from '@/lib/dailyHub/verseContext'
import type { VerseContext } from '@/types/daily-experience'

export function useVerseContextPreload(tab: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [verseContext, setVerseContext] = useState<VerseContext | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const lastConsumedKey = useRef<string | null>(null)
  const hydrating = useRef(false)

  useEffect(() => {
    if (hydrating.current) return

    if (searchParams.get('tab') !== tab) return

    const partial = parseVerseContextFromUrl(searchParams)
    if (!partial) return

    const key = `${partial.book}-${partial.chapter}-${partial.startVerse}-${partial.endVerse}`
    if (key === lastConsumedKey.current) return

    lastConsumedKey.current = key
    hydrating.current = true
    setIsHydrating(true)

    // Clean URL immediately to prevent race conditions with tab switching
    setSearchParams({ tab }, { replace: true })

    hydrateVerseContext(partial).then((ctx) => {
      if (ctx) {
        setVerseContext(ctx)
      }
      setIsHydrating(false)
      hydrating.current = false
    }).catch(() => {
      setIsHydrating(false)
      hydrating.current = false
    })
  }, [searchParams, setSearchParams, tab])

  const clearVerseContext = useCallback(() => {
    setVerseContext(null)
  }, [])

  return { verseContext, isHydrating, clearVerseContext }
}
