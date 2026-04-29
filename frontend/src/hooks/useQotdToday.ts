import { useEffect, useState } from 'react'
import {
  type QuestionOfTheDay,
  getTodaysQuestion,
} from '@/constants/question-of-the-day'
import { fetchTodaysQuestion, adaptQotdResponse } from '@/lib/api/qotd'

/**
 * Spec 3.9 — fetch today's QOTD from the backend, with a constants-fallback path
 * on any non-200 response (network error, 404 QOTD_UNAVAILABLE, abort, timeout).
 *
 * Returns:
 *   - `question`: null while loading, then either the backend question or the
 *     constants-derived fallback.
 *   - `isLoading`: true during the initial fetch, then false (we don't refetch on
 *     remount within the same session — the question is stable for the day and
 *     re-fetching adds noise without value).
 *   - `source`: 'backend' | 'fallback' | null — informational, useful for tests.
 *
 * NOT a dual-write hook. There is no VITE_USE_BACKEND_QOTD flag. The constants
 * path is the offline / API-failure fallback only, not a feature toggle.
 */
export function useQotdToday(): {
  question: QuestionOfTheDay | null
  isLoading: boolean
  source: 'backend' | 'fallback' | null
} {
  const [question, setQuestion] = useState<QuestionOfTheDay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'backend' | 'fallback' | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchTodaysQuestion()
      .then((r) => {
        if (cancelled) return
        setQuestion(adaptQotdResponse(r))
        setSource('backend')
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        // ANY failure (network, 404 QOTD_UNAVAILABLE, timeout, abort) → constants fallback.
        // Per Spec 3.9 D6: preserves offline / degraded-mode behavior.
        setQuestion(getTodaysQuestion())
        setSource('fallback')
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { question, isLoading, source }
}
