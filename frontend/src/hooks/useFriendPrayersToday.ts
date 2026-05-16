import { useCallback, useEffect, useState } from 'react'

import { getFriendPrayersToday } from '@/services/api/prayer-wall-api'
import type { PostListResult } from '@/services/api/prayer-wall-api'
import type { PrayerRequest } from '@/types/prayer-wall'
import { ApiError } from '@/types/auth'

/**
 * Spec 7.4 — Daily Hub Pray tab friend surfacing hook.
 *
 * Returns up to 3 friend posts from the last 24h not yet Quick Lifted by
 * the viewer. Auth-required; the consuming component is expected to gate
 * mounting on `isAuthenticated` and pass that as `enabled`. When `enabled`
 * is false the hook stays inert (no fetch, no error) so an anonymous viewer
 * never produces a 401 in the console.
 *
 * Local-only state: `dismissedIds` tracks posts the user has just Quick
 * Lifted (or otherwise dismissed) so they disappear from the list
 * immediately without waiting for the next refetch. The backend predicate
 * (notCompletedQuickLiftBy) excludes them on the next mount automatically,
 * so the local dismissal is a UX nicety, not a correctness mechanism.
 *
 * Plain data-fetch hook — NOT a reactive store. No subscription pattern
 * applies (Plan-Time Divergence #4 + #5).
 */

interface UseFriendPrayersTodayResult {
  posts: PrayerRequest[]
  isLoading: boolean
  error: ApiError | null
  /** Aggregate crisis-flag across the API response. Per-post `crisisFlag` is
   *  intentionally stripped from `PrayerRequest` (Phase 3 Addendum #7), so
   *  consumers receive only the page-level boolean. Canonical pattern from
   *  Spec 6.11b (`PrayerWall.tsx` setHasCrisisFlag). Spec 7.4 / Universal
   *  Rule 13 / Gate-G-CRISIS-FLAG-HANDLING — consumer renders
   *  CrisisResourcesBanner above the section when this is true. */
  hasCrisisFlag: boolean
  /** Force a refetch (e.g., after the AudioDrawer closes or on tab focus). */
  refetch: () => void
  /** Hide a post from the local list immediately. The next refetch's
   *  backend predicate also excludes it (assuming a completed Quick Lift
   *  session). */
  dismissPost: (postId: string) => void
}

export function useFriendPrayersToday(
  enabled: boolean,
): UseFriendPrayersTodayResult {
  const [posts, setPosts] = useState<PrayerRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [hasCrisisFlag, setHasCrisisFlag] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [refetchToken, setRefetchToken] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setPosts([])
      setError(null)
      setIsLoading(false)
      setHasCrisisFlag(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    getFriendPrayersToday()
      .then((result: PostListResult) => {
        if (cancelled) return
        setPosts(result.posts)
        setHasCrisisFlag(result.hasCrisisFlag)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const apiError =
          e instanceof ApiError
            ? e
            : new ApiError('NETWORK_ERROR', 0, 'Network error', null)
        setError(apiError)
        setPosts([])
        setHasCrisisFlag(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, refetchToken])

  const refetch = useCallback(() => setRefetchToken((t) => t + 1), [])
  const dismissPost = useCallback((postId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(postId)
      return next
    })
  }, [])

  const visiblePosts = posts.filter((p) => !dismissedIds.has(p.id))
  return {
    posts: visiblePosts,
    isLoading,
    error,
    hasCrisisFlag,
    refetch,
    dismissPost,
  }
}
