import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMutes } from '../useMutes'
import { MUTES_KEY } from '@/services/mutes-storage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { name: 'Test User', id: 'test-user-id' },
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>()
  return { ...actual, isBackendMutesEnabled: vi.fn(() => false) }
})

vi.mock('@/lib/auth-storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth-storage')>()
  return { ...actual, getStoredToken: vi.fn(() => null) }
})

vi.mock('@/services/api/mutes-api', () => ({
  muteUserApi: vi.fn(),
  unmuteUserApi: vi.fn(),
  listMutedUsersApi: vi.fn(),
}))

import { useAuth } from '@/hooks/useAuth'
import { isBackendMutesEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import { muteUserApi, unmuteUserApi } from '@/services/api/mutes-api'

const mockUseAuth = vi.mocked(useAuth)
const mockIsBackendMutesEnabled = vi.mocked(isBackendMutesEnabled)
const mockGetStoredToken = vi.mocked(getStoredToken)
const mockMuteUserApi = vi.mocked(muteUserApi)
const mockUnmuteUserApi = vi.mocked(unmuteUserApi)

describe('useMutes', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test User', id: 'test-user-id' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockIsBackendMutesEnabled.mockReturnValue(false)
    mockGetStoredToken.mockReturnValue(null)
    mockMuteUserApi.mockReset()
    mockMuteUserApi.mockResolvedValue({ mutedUserId: '', mutedAt: '' })
    mockUnmuteUserApi.mockReset()
    mockUnmuteUserApi.mockResolvedValue(undefined)
  })

  it('returns empty muted array when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    const { result } = renderHook(() => useMutes())
    expect(result.current.muted).toEqual([])
  })

  it('muteUser is a no-op when unauthenticated (no localStorage write, no API call)', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockIsBackendMutesEnabled.mockReturnValue(true)
    mockGetStoredToken.mockReturnValue('jwt-token')
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.muteUser('user-1')
    })
    expect(localStorage.getItem(MUTES_KEY)).toBeNull()
    expect(mockMuteUserApi).not.toHaveBeenCalled()
  })

  it('muteUser updates localStorage when authenticated, flag off → no API call', () => {
    mockIsBackendMutesEnabled.mockReturnValue(false)
    mockGetStoredToken.mockReturnValue('jwt-token')
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.muteUser('user-1')
    })
    expect(result.current.muted).toContain('user-1')
    const stored = JSON.parse(localStorage.getItem(MUTES_KEY) ?? '{}')
    expect(stored.muted).toContain('user-1')
    expect(mockMuteUserApi).not.toHaveBeenCalled()
  })

  it('muteUser updates localStorage AND fires API when authenticated + flag on + JWT present', () => {
    mockIsBackendMutesEnabled.mockReturnValue(true)
    mockGetStoredToken.mockReturnValue('jwt-token')
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.muteUser('user-1')
    })
    expect(result.current.muted).toContain('user-1')
    expect(mockMuteUserApi).toHaveBeenCalledWith('user-1')
    expect(mockMuteUserApi).toHaveBeenCalledTimes(1)
  })

  it('unmuteUser flag-on + JWT → fires DELETE', () => {
    mockIsBackendMutesEnabled.mockReturnValue(true)
    mockGetStoredToken.mockReturnValue('jwt-token')
    // Seed an existing mute
    localStorage.setItem(MUTES_KEY, JSON.stringify({ muted: ['user-1'] }))
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.unmuteUser('user-1')
    })
    expect(result.current.muted).not.toContain('user-1')
    expect(mockUnmuteUserApi).toHaveBeenCalledWith('user-1')
  })

  it('muteUser is idempotent: calling twice does not duplicate the entry', () => {
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.muteUser('user-1')
    })
    act(() => {
      result.current.muteUser('user-1')
    })
    expect(result.current.muted).toEqual(['user-1'])
  })

  it('backend error during dual-write is swallowed; localStorage state still updates; console.warn fires', async () => {
    mockIsBackendMutesEnabled.mockReturnValue(true)
    mockGetStoredToken.mockReturnValue('jwt-token')
    const apiError = new Error('500 INTERNAL_ERROR')
    mockMuteUserApi.mockRejectedValueOnce(apiError)

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useMutes())
    await act(async () => {
      result.current.muteUser('user-1')
      // Yield so the rejected promise resolves and `.catch` runs
      await Promise.resolve()
    })

    expect(result.current.muted).toContain('user-1')
    expect(warnSpy).toHaveBeenCalledWith(
      '[useMutes] backend muteUser dual-write failed:',
      apiError,
    )

    warnSpy.mockRestore()
  })

  it('flag on + no JWT → no backend call (simulated-auth scenario)', () => {
    mockIsBackendMutesEnabled.mockReturnValue(true)
    mockGetStoredToken.mockReturnValue(null)
    const { result } = renderHook(() => useMutes())
    act(() => {
      result.current.muteUser('user-1')
    })
    expect(result.current.muted).toContain('user-1')
    expect(mockMuteUserApi).not.toHaveBeenCalled()
  })
})
