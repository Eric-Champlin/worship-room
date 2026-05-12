/**
 * Spec 6.1 — Prayer Receipt fetch hook.
 *
 * Gated by `enabled` arg (W30 — defense in depth). The caller (PrayerReceipt
 * component) computes `enabled` from three conditions:
 *   1. viewer is the post author
 *   2. praying_count > 0
 *   3. settings.prayerWall.prayerReceiptsVisible !== false
 *
 * When `enabled === false` the hook NEVER fires a fetch — keeps gate logic
 * in one place at the call site and avoids unnecessary 403s / empty responses.
 *
 * Returns `{ data, loading, error, refetch }`. `error` is an `ApiError` so
 * consumers can branch on `error.status` (403 → server says you can't see
 * this; 429 → rate-limited; etc.).
 */

import { useCallback, useEffect, useState } from 'react'

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import type { PrayerReceiptResponse } from '@/types/prayer-receipt'

export type UsePrayerReceiptResult = {
  data: PrayerReceiptResponse | null
  loading: boolean
  error: ApiError | null
  refetch: () => void
}

export function usePrayerReceipt(
  postId: string,
  enabled: boolean,
): UsePrayerReceiptResult {
  const [data, setData] = useState<PrayerReceiptResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<ApiError | null>(null)

  const fetcher = useCallback(async () => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch<PrayerReceiptResponse>(
        `/api/v1/posts/${postId}/prayer-receipt`,
      )
      setData(response)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e)
      } else {
        setError(new ApiError('UNKNOWN', 0, 'Unknown error', null))
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [postId, enabled])

  useEffect(() => {
    fetcher()
  }, [fetcher])

  return { data, loading, error, refetch: fetcher }
}
