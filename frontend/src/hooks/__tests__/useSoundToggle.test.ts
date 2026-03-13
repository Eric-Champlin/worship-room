import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSoundToggle } from '../useSoundToggle'
import type { Sound } from '@/types/music'
import type { AudioState } from '@/types/audio'
import { AUDIO_CONFIG } from '@/constants/audio'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()
const mockDispatch = vi.fn()

const mockEngine = {
  addSound: vi.fn().mockResolvedValue(undefined),
  removeSound: vi.fn(),
  isBufferCached: vi.fn().mockReturnValue(false),
}

let mockIsLoggedIn = false
let mockActiveSounds: AudioState['activeSounds'] = []

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: mockActiveSounds,
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

// ── Test data ────────────────────────────────────────────────────────

const RAIN: Sound = {
  id: 'gentle-rain',
  name: 'Gentle Rain',
  category: 'nature',
  lucideIcon: 'CloudRain',
  filename: 'rain-gentle.mp3',
  loopDurationMs: 240000,
  tags: { mood: ['peaceful'], activity: ['relaxation'], intensity: 'very_calm' },
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useSoundToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockActiveSounds = []
    mockEngine.addSound.mockResolvedValue(undefined)
    mockEngine.isBufferCached.mockReturnValue(false)
  })

  it('returns empty Sets initially', () => {
    mockIsLoggedIn = true
    const { result } = renderHook(() => useSoundToggle())
    expect(result.current.loadingSoundIds.size).toBe(0)
    expect(result.current.errorSoundIds.size).toBe(0)
  })

  it('calls openAuthModal when user is not logged in', () => {
    mockIsLoggedIn = false
    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to play ambient sounds')
  })

  it('does not dispatch ADD_SOUND when user is not logged in', () => {
    mockIsLoggedIn = false
    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches REMOVE_SOUND when toggling an active sound', () => {
    mockIsLoggedIn = true
    mockActiveSounds = [{ soundId: 'gentle-rain', volume: 0.6, label: 'Gentle Rain' }]

    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REMOVE_SOUND',
      payload: { soundId: 'gentle-rain' },
    })
  })

  it('shows toast when mix is at 6-sound limit', () => {
    mockIsLoggedIn = true
    mockActiveSounds = Array.from({ length: 6 }, (_, i) => ({
      soundId: `sound-${i}`,
      volume: 0.6,
      label: `Sound ${i}`,
    }))

    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    expect(mockShowToast).toHaveBeenCalledWith(
      'Your mix has 6 sounds — remove one to add another.',
      'error',
    )
    expect(mockEngine.addSound).not.toHaveBeenCalled()
  })

  it('sets loading state during sound load', async () => {
    mockIsLoggedIn = true
    // Make addSound hang so we can observe loading state
    let resolveAdd!: () => void
    mockEngine.addSound.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveAdd = resolve
      }),
    )

    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    // Loading state should be set
    expect(result.current.loadingSoundIds.has('gentle-rain')).toBe(true)

    // Resolve the load
    await act(async () => {
      resolveAdd()
    })

    expect(result.current.loadingSoundIds.has('gentle-rain')).toBe(false)
  })

  it('dispatches ADD_SOUND on successful load', async () => {
    mockIsLoggedIn = true

    const { result } = renderHook(() => useSoundToggle())

    await act(async () => {
      result.current.toggleSound(RAIN)
    })

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_SOUND',
        payload: expect.objectContaining({
          soundId: 'gentle-rain',
          volume: AUDIO_CONFIG.DEFAULT_SOUND_VOLUME,
          label: 'Gentle Rain',
        }),
      }),
    )
  })

  it('sets error state and shows toast on load failure after retries', async () => {
    vi.useFakeTimers()
    mockIsLoggedIn = true
    mockEngine.addSound.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSoundToggle())

    // Start the toggle
    act(() => {
      result.current.toggleSound(RAIN)
    })

    // Advance through all retry delays: 1s + 2s + 4s = 7s
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
    }

    // After all retries exhausted, should show error
    expect(result.current.errorSoundIds.has('gentle-rain')).toBe(true)
    expect(mockShowToast).toHaveBeenCalledWith(
      "Couldn't load Gentle Rain — tap to retry",
      'error',
    )
    expect(mockDispatch).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('clears error state when retrying an error sound', async () => {
    mockIsLoggedIn = true

    // First load fails
    mockEngine.addSound.mockRejectedValueOnce(new Error('fail'))
    mockEngine.addSound.mockRejectedValueOnce(new Error('fail'))
    mockEngine.addSound.mockRejectedValueOnce(new Error('fail'))
    mockEngine.addSound.mockRejectedValueOnce(new Error('fail'))

    vi.useFakeTimers()
    const { result } = renderHook(() => useSoundToggle())

    act(() => {
      result.current.toggleSound(RAIN)
    })

    // Exhaust retries
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
    }

    expect(result.current.errorSoundIds.has('gentle-rain')).toBe(true)

    // Now make it succeed on retry
    mockEngine.addSound.mockResolvedValue(undefined)

    act(() => {
      result.current.toggleSound(RAIN)
    })

    // Error should be cleared (loading state set)
    expect(result.current.errorSoundIds.has('gentle-rain')).toBe(false)

    vi.useRealTimers()
  })
})
