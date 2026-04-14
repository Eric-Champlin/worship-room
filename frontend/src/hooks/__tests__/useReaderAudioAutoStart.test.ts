import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReaderAudioAutoStart } from '../useReaderAudioAutoStart'

// --- Mocks ---

const mockDispatch = vi.fn()
const mockSetReadingContext = vi.fn()
const mockEnsureContext = vi.fn()
const mockAddSound = vi.fn()

const DEFAULT_AUDIO_STATE = {
  activeSounds: [],
  foregroundContent: null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.8,
  isPlaying: false,
  sleepTimer: null,
  activeRoutine: null,
  pillVisible: false,
  drawerOpen: false,
  currentSceneName: null,
  currentSceneId: null,
  foregroundEndedCounter: 0,
  readingContext: null,
}

let mockAudioState = { ...DEFAULT_AUDIO_STATE }
let mockIsAuthenticated = true

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => ({
    ensureContext: mockEnsureContext,
    addSound: mockAddSound,
  }),
  useReadingContext: () => ({
    setReadingContext: mockSetReadingContext,
    clearReadingContext: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated, user: { id: '1' } }),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    getListeningHistory: () => [
      { id: '1', contentType: 'ambient', contentId: 'ocean-waves', startedAt: '', durationSeconds: 0, completed: false },
    ],
  },
}))

const BASE_OPTIONS = {
  enabled: true,
  preferredSoundId: 'gentle-rain',
  volume: 35,
  bookName: 'John',
  chapter: 3,
  isReady: true,
}

describe('useReaderAudioAutoStart', () => {
  beforeEach(() => {
    mockAudioState = { ...DEFAULT_AUDIO_STATE }
    mockIsAuthenticated = true
    vi.clearAllMocks()
  })

  it('auto-starts preferred sound when enabled + no audio playing', () => {
    renderHook(() => useReaderAudioAutoStart(BASE_OPTIONS))

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.35 },
    })
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_SOUND',
        payload: expect.objectContaining({ soundId: 'gentle-rain' }),
      }),
    )
  })

  it('does NOT auto-start when disabled', () => {
    renderHook(() =>
      useReaderAudioAutoStart({ ...BASE_OPTIONS, enabled: false }),
    )
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('does NOT auto-start when audio already playing', () => {
    mockAudioState = {
      ...DEFAULT_AUDIO_STATE,
      activeSounds: [{ soundId: 'rain', volume: 0.6, label: 'Rain' }],
      isPlaying: true,
    }
    renderHook(() => useReaderAudioAutoStart(BASE_OPTIONS))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('does NOT re-trigger on re-render for same chapter', () => {
    const { rerender } = renderHook(
      (props) => useReaderAudioAutoStart(props),
      { initialProps: BASE_OPTIONS },
    )

    // First render triggers
    expect(mockDispatch).toHaveBeenCalled()
    mockDispatch.mockClear()

    // Re-render same chapter — should NOT re-trigger
    rerender(BASE_OPTIONS)
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('falls back to last-played when preferred sound missing', () => {
    renderHook(() =>
      useReaderAudioAutoStart({ ...BASE_OPTIONS, preferredSoundId: 'nonexistent-sound' }),
    )
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ADD_SOUND',
        payload: expect.objectContaining({ soundId: 'ocean-waves' }),
      }),
    )
  })

  it('silent failure when preferred sound invalid but fallback exists', () => {
    // Mock history has ocean-waves, so the fallback will be used (tested in 'falls back' test)
    // Here we verify no error is thrown when preferred is invalid
    renderHook(() =>
      useReaderAudioAutoStart({ ...BASE_OPTIONS, preferredSoundId: 'nonexistent-sound' }),
    )
    // Should fall back successfully — no error thrown, ADD_SOUND dispatched for fallback
    expect(mockDispatch).toHaveBeenCalled()
  })

  it('does NOT auto-start when not authenticated', () => {
    mockIsAuthenticated = false
    renderHook(() => useReaderAudioAutoStart(BASE_OPTIONS))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('sets master volume to reader preference', () => {
    renderHook(() =>
      useReaderAudioAutoStart({ ...BASE_OPTIONS, volume: 50 }),
    )
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.5 },
    })
  })

  it('sets reading context on auto-start', () => {
    renderHook(() => useReaderAudioAutoStart(BASE_OPTIONS))
    expect(mockSetReadingContext).toHaveBeenCalledWith({ book: 'John', chapter: 3 })
  })

  it('resets auto-start flag on chapter change', () => {
    // Mock audio as already playing AFTER first render so second render can trigger
    const { rerender } = renderHook(
      (props) => useReaderAudioAutoStart(props),
      { initialProps: BASE_OPTIONS },
    )

    // First render triggers auto-start
    expect(mockDispatch).toHaveBeenCalled()
    mockDispatch.mockClear()

    // Change chapter — flag resets, but now we need to simulate state where audio isn't playing
    // (since auto-start added a sound, the state would show it playing, but our mock is fixed)
    rerender({ ...BASE_OPTIONS, chapter: 4 })
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ADD_SOUND' }),
    )
  })
})
