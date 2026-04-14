import { useState, useEffect, useRef } from 'react'

import { loadChapterWeb } from '@/data/bible'
import { getAllHighlights, subscribe as hlSubscribe } from '@/lib/bible/highlightStore'
import { getEchoForHomePage } from '@/lib/echoes'
import { getAllVisits, subscribe as visitSubscribe } from '@/lib/heatmap/chapterVisitStore'
import { getAllCards, subscribe as memSubscribe } from '@/lib/memorize'
import type { Echo, EchoKind } from '@/types/echoes'

/** Module-level session freshness tracking — shared across hook instances, lost on reload */
const seenSet = new Set<string>()

/** Marks an echo as seen for the current session (freshness penalty on next computation) */
export function markEchoSeen(id: string): void {
  seenSet.add(id)
}

/**
 * Resolves verse text for highlight-based echoes by loading the chapter and extracting verses.
 * Returns the echo with populated text, or the original echo if loading fails.
 */
async function resolveVerseText(echo: Echo): Promise<Echo> {
  if (echo.text || echo.startVerse === 0) return echo

  try {
    const chapter = await loadChapterWeb(echo.book, echo.chapter)
    if (!chapter) return echo

    const verses = chapter.verses.filter(
      (v) => v.number >= echo.startVerse && v.number <= echo.endVerse,
    )
    const text = verses.map((v) => v.text).join(' ')
    return { ...echo, text }
  } catch {
    return echo
  }
}

/**
 * Returns a single echo or null. Subscribes to all three source stores reactively.
 * Highlight echoes have their verse text async-resolved.
 */
export function useEcho(options?: { kinds?: EchoKind[] }): Echo | null {
  const [echo, setEcho] = useState<Echo | null>(null)
  const kindsRef = useRef(options?.kinds)

  useEffect(() => {
    function compute() {
      const raw = getEchoForHomePage(
        getAllHighlights(),
        getAllCards(),
        getAllVisits(),
        seenSet,
      )

      // Filter by kinds if specified
      if (raw && kindsRef.current && kindsRef.current.length > 0) {
        const allowedKinds = new Set(kindsRef.current)
        if (!allowedKinds.has(raw.kind)) {
          setEcho(null)
          return
        }
      }

      if (!raw) {
        setEcho(null)
        return
      }

      // Set immediately (may have empty text for highlights)
      setEcho(raw)

      // Async-resolve verse text for highlight echoes
      if (raw.kind === 'highlighted' && !raw.text) {
        resolveVerseText(raw).then((resolved) => {
          setEcho(resolved)
        }).catch(() => { /* silent — echo displays without text */ })
      }
    }

    compute()

    const unsubHl = hlSubscribe(compute)
    const unsubMem = memSubscribe(compute)
    const unsubVisit = visitSubscribe(compute)

    return () => {
      unsubHl()
      unsubMem()
      unsubVisit()
    }
  }, [])

  return echo
}

