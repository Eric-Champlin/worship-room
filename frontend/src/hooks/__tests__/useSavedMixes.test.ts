import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSavedMixes } from '../useSavedMixes'
import { storageService } from '@/services/storage-service'

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

// ── Test data ────────────────────────────────────────────────────────

const SOUNDS = [
  { soundId: 'gentle-rain', volume: 0.7 },
  { soundId: 'fireplace', volume: 0.5 },
]

// ── Tests ────────────────────────────────────────────────────────────

describe('useSavedMixes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockIsAuthenticated = false
  })

  it('returns empty mixes initially', () => {
    const { result } = renderHook(() => useSavedMixes())
    expect(result.current.mixes).toEqual([])
  })

  it('saveMix opens auth modal when logged out', () => {
    const { result } = renderHook(() => useSavedMixes())

    let mix: ReturnType<typeof result.current.saveMix>
    act(() => {
      mix = result.current.saveMix('My Mix', SOUNDS)
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to save your mix')
    expect(mix!).toBeNull()
    expect(result.current.mixes).toEqual([])
  })

  it('saveMix persists and returns new mix when logged in', () => {
    mockIsAuthenticated = true
    const { result } = renderHook(() => useSavedMixes())

    let mix: ReturnType<typeof result.current.saveMix>
    act(() => {
      mix = result.current.saveMix('Evening Calm', SOUNDS)
    })

    expect(mix!).not.toBeNull()
    expect(mix!.name).toBe('Evening Calm')
    expect(result.current.mixes).toHaveLength(1)
    expect(storageService.getSavedMixes()).toHaveLength(1)
  })

  it('deleteMix removes from state and localStorage', () => {
    mockIsAuthenticated = true
    const saved = storageService.saveMix('My Mix', SOUNDS)

    const { result } = renderHook(() => useSavedMixes())
    expect(result.current.mixes).toHaveLength(1)

    act(() => {
      result.current.deleteMix(saved.id)
    })

    expect(result.current.mixes).toEqual([])
    expect(storageService.getSavedMixes()).toEqual([])
  })

  it('duplicateMix creates " Copy" suffixed duplicate', () => {
    mockIsAuthenticated = true
    const saved = storageService.saveMix('Evening Calm', SOUNDS)

    const { result } = renderHook(() => useSavedMixes())

    let copy: ReturnType<typeof result.current.duplicateMix>
    act(() => {
      copy = result.current.duplicateMix(saved.id)
    })

    expect(copy!).not.toBeNull()
    expect(copy!.name).toBe('Evening Calm Copy')
    expect(result.current.mixes).toHaveLength(2)
  })

  it('updateName updates mix name', () => {
    mockIsAuthenticated = true
    const saved = storageService.saveMix('Old Name', SOUNDS)

    const { result } = renderHook(() => useSavedMixes())

    act(() => {
      result.current.updateName(saved.id, 'New Name')
    })

    expect(result.current.mixes[0].name).toBe('New Name')
  })
})
