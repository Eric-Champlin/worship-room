/**
 * Spec 6.5 — Intercessor Timeline hook.
 *
 * Owned by `PrayerCard` (NOT by `IntercessorTimeline`) so that
 * `InteractionBar` — which is mounted as a child of `PrayerCard` via the
 * `{children}` slot — can fire optimistic updates through the
 * `IntercessorActionsContext` provider that `PrayerCard` also owns.
 *
 * Not a reactive store — each card has its own per-postId state. Pure React
 * `useState` + a `fetch` via `apiFetch`.
 *
 * The hook tracks `totalCount` as a unified count source: it initializes
 * from the parent-provided `initialCount` (typically `prayer.prayingCount`),
 * stays in sync with that prop while the timeline is collapsed (so a feed
 * refresh updates the visible count), is replaced by server-truth when the
 * user expands the timeline, and is adjusted optimistically when the viewer
 * toggles their own praying reaction. Components reading from this hook
 * should use `totalCount` for both the collapsed summary line and the
 * expanded entries header — no separate live-count plumbing is needed at
 * the call site.
 */

import { useCallback, useEffect, useState } from 'react'
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

export function useIntercessors(
  postId: string,
  initialCount: number = 0,
): UseIntercessorsResult {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<IntercessorEntry[]>([])
  const [totalCount, setTotalCount] = useState(initialCount)

  // Keep the count in sync with the parent's `initialCount` while collapsed.
  // Once the user expands, the server response is authoritative — we don't
  // let a subsequent feed refresh stomp on the fresh totalCount.
  useEffect(() => {
    if (!expanded) {
      setTotalCount(initialCount)
    }
  }, [initialCount, expanded])

  const expand = useCallback(async () => {
    // Short-circuit on `expanded` AND on `loading` so a double-tap during the
    // initial fetch doesn't fire two requests with overlapping resolution.
    if (expanded || loading) return
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
  }, [postId, expanded, loading])

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
