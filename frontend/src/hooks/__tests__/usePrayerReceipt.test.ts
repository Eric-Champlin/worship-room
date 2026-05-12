import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'
import { ApiError } from '@/types/auth'
import { usePrayerReceipt } from '../usePrayerReceipt'
import type { PrayerReceiptResponse } from '@/types/prayer-receipt'

const POST_ID = 'post-1'

describe('usePrayerReceipt', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset()
  })

  it('does NOT fetch when enabled=false on mount (W30 defense in depth)', async () => {
    const { result } = renderHook(() => usePrayerReceipt(POST_ID, false))

    // Allow microtasks to settle
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiFetch).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('fetches and returns data on enabled=true + 200 response', async () => {
    const mockReceipt: PrayerReceiptResponse = {
      totalCount: 3,
      attributedIntercessors: [
        { userId: 'u1', displayName: 'Alice', avatarUrl: null },
      ],
      anonymousCount: 2,
    }
    vi.mocked(apiFetch).mockResolvedValue(mockReceipt as never)

    const { result } = renderHook(() => usePrayerReceipt(POST_ID, true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiFetch).toHaveBeenCalledWith(`/api/v1/posts/${POST_ID}/prayer-receipt`)
    expect(result.current.data).toEqual(mockReceipt)
    expect(result.current.error).toBeNull()
  })

  it('surfaces 403 as an ApiError with status=403', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError('FORBIDDEN', 403, 'Forbidden.', null),
    )

    const { result } = renderHook(() => usePrayerReceipt(POST_ID, true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.status).toBe(403)
    expect(result.current.error?.code).toBe('FORBIDDEN')
  })

  it('surfaces 500 as an ApiError without losing prior state', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError('INTERNAL_ERROR', 500, 'Server error', null),
    )

    const { result } = renderHook(() => usePrayerReceipt(POST_ID, true))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.status).toBe(500)
    expect(result.current.data).toBeNull()
  })

  it('toggles enabled true→false: clears state and does NOT fetch again', async () => {
    const mockReceipt: PrayerReceiptResponse = {
      totalCount: 1,
      attributedIntercessors: [],
      anonymousCount: 1,
    }
    vi.mocked(apiFetch).mockResolvedValue(mockReceipt as never)

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        usePrayerReceipt(POST_ID, enabled),
      { initialProps: { enabled: true } },
    )

    await waitFor(() => expect(result.current.data).toEqual(mockReceipt))
    expect(apiFetch).toHaveBeenCalledTimes(1)

    // Flip enabled→false
    rerender({ enabled: false })

    await waitFor(() => expect(result.current.data).toBeNull())
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(false)
    // No new fetch fired
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('refetch() re-invokes apiFetch when enabled', async () => {
    const first: PrayerReceiptResponse = {
      totalCount: 1,
      attributedIntercessors: [],
      anonymousCount: 1,
    }
    const second: PrayerReceiptResponse = {
      totalCount: 2,
      attributedIntercessors: [],
      anonymousCount: 2,
    }
    vi.mocked(apiFetch).mockResolvedValueOnce(first as never)
    vi.mocked(apiFetch).mockResolvedValueOnce(second as never)

    const { result } = renderHook(() => usePrayerReceipt(POST_ID, true))
    await waitFor(() => expect(result.current.data).toEqual(first))

    await act(async () => {
      result.current.refetch()
    })
    await waitFor(() => expect(result.current.data).toEqual(second))
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
})
