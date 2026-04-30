import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('@/services/api/legal-api', () => ({
  getLegalVersionsApi: vi.fn(),
}))

import { getLegalVersionsApi } from '@/services/api/legal-api'
import { useLegalVersions, __resetLegalVersionsCache } from '../useLegalVersions'
import { AUTH_INVALIDATED_EVENT } from '@/lib/api-client'

const stable = {
  termsVersion: '2026-04-29',
  privacyVersion: '2026-04-29',
  communityGuidelinesVersion: '2026-04-29',
}

describe('useLegalVersions', () => {
  beforeEach(() => {
    __resetLegalVersionsCache()
    vi.mocked(getLegalVersionsApi).mockReset()
    vi.mocked(getLegalVersionsApi).mockResolvedValue(stable)
  })

  it('fetches on mount', async () => {
    renderHook(() => useLegalVersions())
    await waitFor(() => {
      expect(getLegalVersionsApi).toHaveBeenCalledTimes(1)
    })
  })

  it('returns current versions', async () => {
    const { result } = renderHook(() => useLegalVersions())
    await waitFor(() => {
      expect(result.current.versions).not.toBeNull()
    })
    expect(result.current.versions?.termsVersion).toBe('2026-04-29')
    expect(result.current.versions?.privacyVersion).toBe('2026-04-29')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles 5xx by returning error state', async () => {
    vi.mocked(getLegalVersionsApi).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLegalVersions())
    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })
    expect(result.current.versions).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })

  it('refetches on auth-invalidated event', async () => {
    const { result } = renderHook(() => useLegalVersions())
    await waitFor(() => {
      expect(result.current.versions).not.toBeNull()
    })
    expect(getLegalVersionsApi).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_INVALIDATED_EVENT))
    })

    await waitFor(() => {
      expect(getLegalVersionsApi).toHaveBeenCalledTimes(2)
    })
  })
})
