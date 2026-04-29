import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useQotdToday } from '@/hooks/useQotdToday'

vi.mock('@/lib/api/qotd', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/api/qotd')>('@/lib/api/qotd')
  return {
    ...actual,
    fetchTodaysQuestion: vi.fn(),
  }
})

import { fetchTodaysQuestion } from '@/lib/api/qotd'
import { getTodaysQuestion } from '@/constants/question-of-the-day'

describe('useQotdToday', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the API response on success', async () => {
    vi.mocked(fetchTodaysQuestion).mockResolvedValueOnce({
      id: 'qotd-42',
      text: 'API question',
      theme: 'encouraging',
      hint: null,
    })

    const { result } = renderHook(() => useQotdToday())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.question?.id).toBe('qotd-42')
    expect(result.current.question?.text).toBe('API question')
    expect(result.current.source).toBe('backend')
  })

  it('falls back to constants on network error', async () => {
    vi.mocked(fetchTodaysQuestion).mockRejectedValueOnce(
      new Error('Network error'),
    )

    const { result } = renderHook(() => useQotdToday())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.question).toEqual(getTodaysQuestion())
    expect(result.current.source).toBe('fallback')
  })

  it('falls back to constants on 404 QOTD_UNAVAILABLE', async () => {
    // ApiError-shaped 404 — apiFetch throws ApiError on non-2xx.
    const err = Object.assign(new Error('Not Found'), {
      status: 404,
      code: 'QOTD_UNAVAILABLE',
    })
    vi.mocked(fetchTodaysQuestion).mockRejectedValueOnce(err)

    const { result } = renderHook(() => useQotdToday())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.question).toEqual(getTodaysQuestion())
    expect(result.current.source).toBe('fallback')
  })
})
