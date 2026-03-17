import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFavorites } from '../useFavorites'
import { storageService, StorageQuotaError } from '@/services/storage-service'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()
let mockIsAuthenticated = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: mockIsAuthenticated }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockIsAuthenticated = false
  })

  it('returns empty favorites initially', () => {
    const { result } = renderHook(() => useFavorites())
    expect(result.current.favorites).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('toggleFavorite opens auth modal when logged out', () => {
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggleFavorite('scene', 'morning-mist')
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save favorites')
    expect(result.current.favorites).toEqual([])
  })

  it('toggleFavorite adds favorite when logged in', () => {
    mockIsAuthenticated = true
    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggleFavorite('scene', 'morning-mist')
    })

    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.isFavorite('scene', 'morning-mist')).toBe(true)
    expect(storageService.isFavorite('scene', 'morning-mist')).toBe(true)
  })

  it('toggleFavorite removes favorite when already favorited', () => {
    mockIsAuthenticated = true
    storageService.addFavorite('scene', 'morning-mist')

    const { result } = renderHook(() => useFavorites())

    act(() => {
      result.current.toggleFavorite('scene', 'morning-mist')
    })

    expect(result.current.favorites).toHaveLength(0)
    expect(result.current.isFavorite('scene', 'morning-mist')).toBe(false)
  })

  it('reverts on localStorage error with toast', () => {
    mockIsAuthenticated = true
    const { result } = renderHook(() => useFavorites())

    // Make addFavorite throw quota error
    vi.spyOn(storageService, 'addFavorite').mockImplementation(() => {
      throw new StorageQuotaError()
    })

    act(() => {
      result.current.toggleFavorite('scene', 'morning-mist')
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Storage is full. Please remove some items.',
      'error',
    )
    // Should revert — no favorites in localStorage
    expect(result.current.favorites).toEqual([])

    vi.restoreAllMocks()
  })

  it('loads existing favorites on mount when logged in', () => {
    storageService.addFavorite('scene', 'morning-mist')
    storageService.addFavorite('sleep_session', 'psalm-23')
    mockIsAuthenticated = true

    const { result } = renderHook(() => useFavorites())

    expect(result.current.favorites).toHaveLength(2)
    expect(result.current.isFavorite('scene', 'morning-mist')).toBe(true)
    expect(result.current.isFavorite('sleep_session', 'psalm-23')).toBe(true)
  })
})
