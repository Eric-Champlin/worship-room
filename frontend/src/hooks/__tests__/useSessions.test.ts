import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('@/services/api/sessions-api', () => ({
  listSessionsApi: vi.fn(),
  revokeSessionApi: vi.fn(),
  revokeAllOtherSessionsApi: vi.fn(),
  revokeAllSessionsApi: vi.fn(),
}))

import {
  listSessionsApi,
  revokeSessionApi,
  revokeAllOtherSessionsApi,
  revokeAllSessionsApi,
} from '@/services/api/sessions-api'
import { useSessions } from '../useSessions'
import type { Session } from '@/types/api/sessions'

const buildSession = (overrides: Partial<Session> = {}): Session => ({
  sessionId: 'session-1',
  deviceLabel: 'Chrome 124 on macOS 14',
  ipCity: 'Brooklyn',
  lastSeenAt: '2026-05-12T10:00:00Z',
  createdAt: '2026-05-12T09:00:00Z',
  isCurrent: false,
  ...overrides,
})

describe('useSessions — Spec 1.5g', () => {
  beforeEach(() => {
    vi.mocked(listSessionsApi).mockReset()
    vi.mocked(revokeSessionApi).mockReset()
    vi.mocked(revokeAllOtherSessionsApi).mockReset()
    vi.mocked(revokeAllSessionsApi).mockReset()
  })

  it('loads sessions on mount and exposes them via `sessions`', async () => {
    const data = [buildSession(), buildSession({ sessionId: 'session-2' })]
    vi.mocked(listSessionsApi).mockResolvedValue(data)

    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual(data)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a friendly error message on fetch failure', async () => {
    vi.mocked(listSessionsApi).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Couldn't load sessions — try again.")
    expect(result.current.sessions).toEqual([])
  })

  it('optimistically removes the revoked session, then refetches on success', async () => {
    const before = [
      buildSession({ sessionId: 'a' }),
      buildSession({ sessionId: 'b' }),
    ]
    const after = [buildSession({ sessionId: 'a' })]
    vi.mocked(listSessionsApi)
      .mockResolvedValueOnce(before) // initial load
      .mockResolvedValueOnce(after) // refetch after revoke
    vi.mocked(revokeSessionApi).mockResolvedValue(undefined)

    const { result } = renderHook(() => useSessions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok: boolean = false
    await act(async () => {
      ok = await result.current.revoke('b')
    })

    expect(ok).toBe(true)
    expect(revokeSessionApi).toHaveBeenCalledWith('b')
    expect(result.current.sessions).toEqual(after)
  })

  it('rolls back the optimistic removal on revoke failure (returns false)', async () => {
    const before = [
      buildSession({ sessionId: 'a' }),
      buildSession({ sessionId: 'b' }),
    ]
    vi.mocked(listSessionsApi).mockResolvedValue(before)
    vi.mocked(revokeSessionApi).mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useSessions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok: boolean = true
    await act(async () => {
      ok = await result.current.revoke('b')
    })

    expect(ok).toBe(false)
    // The list returns to its pre-revoke state and the error message surfaces.
    await waitFor(() => {
      expect(result.current.sessions).toEqual(before)
      expect(result.current.error).toBe("Couldn't sign out that session — try again.")
    })
  })

  it('revokeOthers calls the bulk-others endpoint and refetches', async () => {
    const before = [buildSession({ sessionId: 'a', isCurrent: true })]
    vi.mocked(listSessionsApi).mockResolvedValue(before)
    vi.mocked(revokeAllOtherSessionsApi).mockResolvedValue(undefined)

    const { result } = renderHook(() => useSessions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.revokeOthers()
    })

    expect(revokeAllOtherSessionsApi).toHaveBeenCalledTimes(1)
    expect(listSessionsApi).toHaveBeenCalledTimes(2) // initial + refetch
  })

  it('revokeAll calls the bulk-all endpoint and does NOT refetch (caller redirects)', async () => {
    vi.mocked(listSessionsApi).mockResolvedValue([buildSession()])
    vi.mocked(revokeAllSessionsApi).mockResolvedValue(undefined)

    const { result } = renderHook(() => useSessions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = vi.mocked(listSessionsApi).mock.calls.length

    await act(async () => {
      await result.current.revokeAll()
    })

    expect(revokeAllSessionsApi).toHaveBeenCalledTimes(1)
    // No refetch — the current token is about to fail.
    expect(vi.mocked(listSessionsApi).mock.calls.length).toBe(callsBefore)
  })
})
