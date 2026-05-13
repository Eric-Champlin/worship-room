/**
 * Spec 6.5 — Intercessor Timeline hook.
 *
 * Owned by `PrayerCard` (NOT by `IntercessorTimeline`) so the `InteractionBar`
 * praying-reaction handler can call `optimisticInsert` / `optimisticRemove`
 * without sibling-component handle plumbing.
 *
 * Not a reactive store — each card has its own per-postId state. Pure React
 * `useState` + a `fetch` via `apiFetch`.
 */

import { useCallback, useState } from 'react'
import { fetchIntercessors } from '@/services/api/intercessor-api'
import type { IntercessorEntry } from '@/types/intercessor'

export interface UseIntercessorsResult {
  entries: IntercessorEntry[]
  totalCount: number
  expanded: boolean
  loading: boolean
  error: string | null
  expand: () => Promise<void>
  collapse: () => void
  optimisticInsert: (entry: IntercessorEntry) => void
  optimisticRemove: (viewerUserId: string) => void
}

export function useIntercessors(postId: string): UseIntercessorsResult {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<IntercessorEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const expand = useCallback(async () => {
    if (expanded) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetchIntercessors(postId)
      setEntries(response.entries)
      setTotalCount(response.totalCount)
      setExpanded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load intercessors')
    } finally {
      setLoading(false)
    }
  }, [postId, expanded])

  const collapse = useCallback(() => setExpanded(false), [])

  const optimisticInsert = useCallback((entry: IntercessorEntry) => {
    setEntries((prev) => [entry, ...prev])
    setTotalCount((c) => c + 1)
  }, [])

  const optimisticRemove = useCallback((viewerUserId: string) => {
    setEntries((prev) =>
      prev.filter((e) => e.isAnonymous || e.userId !== viewerUserId),
    )
    setTotalCount((c) => Math.max(0, c - 1))
  }, [])

  return {
    entries,
    totalCount,
    expanded,
    loading,
    error,
    expand,
    collapse,
    optimisticInsert,
    optimisticRemove,
  }
}
