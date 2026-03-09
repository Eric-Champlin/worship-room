import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useForegroundPlayer } from '../useForegroundPlayer'
import type { AudioState } from '@/types/audio'
import type { ScriptureReading, BedtimeStory } from '@/types/music'

// ── Mocks ────────────────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockDispatch = vi.fn()

const mockAudioElement = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  pause: vi.fn(),
  play: vi.fn().mockResolvedValue(undefined),
  src: '',
}

const mockEngine = {
  playForeground: vi.fn().mockReturnValue(mockAudioElement),
  seekForeground: vi.fn(),
  getForegroundElement: vi.fn().mockReturnValue(mockAudioElement),
  audioContext: null,
  foregroundGainNode: null,
}

let mockIsLoggedIn = false
let mockForegroundContent: AudioState['foregroundContent'] = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: mockForegroundContent,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

// ── Test data ────────────────────────────────────────────────────────

const MOCK_SCRIPTURE: ScriptureReading = {
  id: 'psalm-23',
  title: 'The Lord is My Shepherd',
  scriptureReference: 'Psalm 23',
  collectionId: 'psalms-of-peace',
  webText: 'Yahweh is my shepherd:\nI shall lack nothing.',
  audioFilename: 'scripture/psalm-23.mp3',
  durationSeconds: 300,
  voiceId: 'male',
  tags: ['peace'],
}

const MOCK_STORY: BedtimeStory = {
  id: 'noah-and-the-great-flood',
  title: 'Noah and the Great Flood',
  description: 'The world grows dark with wickedness...',
  audioFilename: 'stories/noah-and-the-great-flood.mp3',
  durationSeconds: 1080,
  voiceId: 'male',
  lengthCategory: 'medium',
  tags: ['faith'],
}

const MOCK_OTHER_SCRIPTURE: ScriptureReading = {
  id: 'psalm-46',
  title: 'God is Our Refuge',
  scriptureReference: 'Psalm 46',
  collectionId: 'psalms-of-peace',
  webText: 'God is our refuge and strength.',
  audioFilename: 'scripture/psalm-46.mp3',
  durationSeconds: 360,
  voiceId: 'female',
  tags: ['peace'],
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useForegroundPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockForegroundContent = null
  })

  it('calls openAuthModal when isLoggedIn is false', () => {
    mockIsLoggedIn = false
    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_SCRIPTURE)
    })

    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to listen to sleep content',
    )
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('dispatches START_FOREGROUND with correct metadata for scripture when logged in', () => {
    mockIsLoggedIn = true
    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_SCRIPTURE)
    })

    expect(mockEngine.playForeground).toHaveBeenCalledWith(
      '/audio/scripture/psalm-23.mp3',
    )

    const startCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'START_FOREGROUND',
    )
    expect(startCalls).toHaveLength(1)
    expect(startCalls[0][0].payload).toEqual({
      contentId: 'psalm-23',
      contentType: 'scripture',
      title: 'The Lord is My Shepherd',
      duration: 300,
      scriptureReference: 'Psalm 23',
      voiceGender: 'male',
      webText: 'Yahweh is my shepherd:\nI shall lack nothing.',
    })
  })

  it('dispatches START_FOREGROUND with correct metadata for story', () => {
    mockIsLoggedIn = true
    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_STORY)
    })

    const startCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'START_FOREGROUND',
    )
    expect(startCalls).toHaveLength(1)
    expect(startCalls[0][0].payload).toEqual({
      contentId: 'noah-and-the-great-flood',
      contentType: 'story',
      title: 'Noah and the Great Flood',
      duration: 1080,
      scriptureReference: undefined,
      voiceGender: 'male',
      webText: undefined,
    })
  })

  it('sets pendingSwitch when foreground already playing', () => {
    mockIsLoggedIn = true
    mockForegroundContent = {
      contentId: 'psalm-23',
      contentType: 'scripture',
      title: 'The Lord is My Shepherd',
      duration: 300,
      playbackPosition: 120,
      isPlaying: true,
    }

    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_OTHER_SCRIPTURE)
    })

    expect(mockEngine.playForeground).not.toHaveBeenCalled()
    expect(result.current.pendingSwitch).not.toBeNull()
    expect(result.current.pendingSwitch?.currentTitle).toBe(
      'The Lord is My Shepherd',
    )
    expect(result.current.pendingSwitch?.newTitle).toBe('God is Our Refuge')
  })

  it('pendingSwitch contains correct remainingTime', () => {
    mockIsLoggedIn = true
    mockForegroundContent = {
      contentId: 'psalm-23',
      contentType: 'scripture',
      title: 'The Lord is My Shepherd',
      duration: 300,
      playbackPosition: 120,
      isPlaying: true,
    }

    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_OTHER_SCRIPTURE)
    })

    expect(result.current.pendingSwitch?.remainingTime).toBe(180)
  })

  it('cancelSwitch clears pendingSwitch without changing playback', () => {
    mockIsLoggedIn = true
    mockForegroundContent = {
      contentId: 'psalm-23',
      contentType: 'scripture',
      title: 'The Lord is My Shepherd',
      duration: 300,
      playbackPosition: 120,
      isPlaying: true,
    }

    const { result } = renderHook(() => useForegroundPlayer())

    act(() => {
      result.current.startSession(MOCK_OTHER_SCRIPTURE)
    })

    expect(result.current.pendingSwitch).not.toBeNull()

    act(() => {
      result.current.cancelSwitch()
    })

    expect(result.current.pendingSwitch).toBeNull()
    expect(mockEngine.playForeground).not.toHaveBeenCalled()
  })
})
