import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useQuickLift } from '@/hooks/useQuickLift'
import { ApiError } from '@/types/auth'

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}))

import { apiFetch } from '@/lib/api-client'

describe('useQuickLift', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('start happy path transitions idle → starting → running', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      data: {
        sessionId: '00000000-0000-0000-0000-000000000001',
        serverStartedAt: '2026-05-12T10:00:00Z',
      },
      meta: { requestId: 'req-1' },
    })

    const { result } = renderHook(() => useQuickLift('post-abc'))
    expect(result.current.state.phase).toBe('idle')

    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state.phase).toBe('running')
    if (result.current.state.phase === 'running') {
      expect(result.current.state.sessionId).toBe('00000000-0000-0000-0000-000000000001')
      expect(typeof result.current.state.serverStartedAt).toBe('number')
    }
  })

  it('start 409 ACTIVE_SESSION_EXISTS shows friendly message', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('ACTIVE_SESSION_EXISTS', 409, 'duplicate', null),
    )

    const { result } = renderHook(() => useQuickLift('post-abc'))
    await act(async () => {
      await result.current.start()
    })

    expect(result.current.state.phase).toBe('error')
    if (result.current.state.phase === 'error') {
      expect(result.current.state.code).toBe('ACTIVE_SESSION_EXISTS')
      expect(result.current.state.message).toContain('finish that one first')
    }
  })

  it('complete 400 TIMING_TOO_EARLY shows the 30-second message', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('TIMING_TOO_EARLY', 400, 'too early', null),
    )

    const { result } = renderHook(() => useQuickLift('post-abc'))
    await act(async () => {
      await result.current.complete('session-1')
    })

    await waitFor(() => {
      expect(result.current.state.phase).toBe('error')
    })
    if (result.current.state.phase === 'error') {
      expect(result.current.state.message).toContain('full 30 seconds')
    }
  })

  it('reset returns state to idle', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError('NOT_FOUND', 404, 'no post', null),
    )
    const { result } = renderHook(() => useQuickLift('post-abc'))
    await act(async () => {
      await result.current.start()
    })
    expect(result.current.state.phase).toBe('error')

    act(() => result.current.reset())
    expect(result.current.state.phase).toBe('idle')
  })
})
