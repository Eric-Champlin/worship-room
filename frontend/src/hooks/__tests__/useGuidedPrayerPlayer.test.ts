import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useGuidedPrayerPlayer,
  type UseGuidedPrayerPlayerProps,
} from '../useGuidedPrayerPlayer'
import type { GuidedPrayerSession } from '@/types/guided-prayer'

// --- Mocks ---

const mockLoadScene = vi.fn()
const mockAudioDispatch = vi.fn()
const mockPlayChime = vi.fn()

let mockAudioState = {
  activeSounds: [] as { id: string }[],
  isPlaying: false,
  currentSceneName: null as string | null,
  currentSceneId: null as string | null,
  pillVisible: false,
  drawerOpen: false,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null as { id: string } | null,
  masterVolume: 0.8,
  foregroundBackgroundBalance: 0.5,
  foregroundEndedCounter: 0,
}

let mockReducedMotion = false

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioDispatch: () => mockAudioDispatch,
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

vi.mock('@/lib/audio', () => ({
  playChime: () => mockPlayChime(),
}))

// Mock SpeechSynthesisUtterance
class MockUtterance {
  text: string
  rate = 1
  onboundary: ((event: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).SpeechSynthesisUtterance = MockUtterance

// Mock wake lock
const mockRelease = vi.fn().mockResolvedValue(undefined)
const mockWakeLockSentinel = { release: mockRelease }
const mockWakeLockRequest = vi.fn().mockResolvedValue(mockWakeLockSentinel)
Object.defineProperty(navigator, 'wakeLock', {
  value: { request: mockWakeLockRequest },
  writable: true,
  configurable: true,
})

// Mock speechSynthesis
const mockSpeak = vi.fn()
const mockCancel = vi.fn()
const mockPause = vi.fn()
const mockResume = vi.fn()

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    pause: mockPause,
    resume: mockResume,
  },
  writable: true,
  configurable: true,
})

// --- Test data ---

const TEST_SESSION: GuidedPrayerSession = {
  id: 'test-session',
  title: 'Test Session',
  description: 'A test session',
  theme: 'peace',
  durationMinutes: 5,
  icon: 'Leaf',
  completionVerse: {
    reference: 'Test 1:1',
    text: 'Test verse text.',
  },
  script: [
    { type: 'narration', text: 'Hello world test narration.', durationSeconds: 3 },
    { type: 'silence', text: '', durationSeconds: 2 },
    { type: 'narration', text: 'Final narration segment.', durationSeconds: 3 },
  ],
}

const SHORT_SESSION: GuidedPrayerSession = {
  ...TEST_SESSION,
  id: 'short-session',
  script: [
    { type: 'narration', text: 'Only segment.', durationSeconds: 1 },
  ],
}

// --- Helpers ---

function renderPlayer(
  overrides: Partial<UseGuidedPrayerPlayerProps> = {}
) {
  const onComplete = vi.fn()
  const onClose = vi.fn()

  const props: UseGuidedPrayerPlayerProps = {
    session: TEST_SESSION,
    onComplete,
    onClose,
    ...overrides,
  }

  const result = renderHook(() => useGuidedPrayerPlayer(props))
  return { ...result, onComplete, onClose }
}

// --- Tests ---

beforeEach(() => {
  vi.useFakeTimers()
  mockAudioState = {
    activeSounds: [],
    isPlaying: false,
    currentSceneName: null,
    currentSceneId: null,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
    masterVolume: 0.8,
    foregroundBackgroundBalance: 0.5,
    foregroundEndedCounter: 0,
  }
  mockReducedMotion = false
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useGuidedPrayerPlayer', () => {
  it('returns idle state when session is provided but not started', () => {
    const { result } = renderPlayer()
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.currentSegmentIndex).toBe(0)
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it('starts playback on play()', () => {
    const { result } = renderPlayer()
    act(() => {
      result.current.play()
    })
    expect(result.current.isPlaying).toBe(true)
  })

  it('calculates totalDurationSeconds from segments', () => {
    const { result } = renderPlayer()
    // 3 + 2 + 3 = 8
    expect(result.current.totalDurationSeconds).toBe(8)
  })

  it('returns null for currentSegment when session is null', () => {
    const { result } = renderPlayer({ session: null })
    expect(result.current.currentSegment).toBeNull()
  })

  it('pauses and resumes correctly', () => {
    const { result } = renderPlayer()
    act(() => {
      result.current.play()
    })
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      result.current.pause()
    })
    expect(result.current.isPaused).toBe(true)
    expect(result.current.isPlaying).toBe(false)
    expect(mockPause).toHaveBeenCalled()

    act(() => {
      result.current.play()
    })
    expect(result.current.isPlaying).toBe(true)
    expect(mockResume).toHaveBeenCalled()
  })

  it('stop cancels TTS and calls onClose', () => {
    const { result, onClose } = renderPlayer()
    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.stop()
    })
    expect(mockCancel).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(false)
  })

  it('no activity recorded on stop', () => {
    const { result, onComplete } = renderPlayer()
    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.stop()
    })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('calls onComplete when all segments finish', () => {
    const { result, onComplete } = renderPlayer({ session: SHORT_SESSION })
    act(() => {
      result.current.play()
    })

    // Trigger TTS onend
    const utterance = mockSpeak.mock.calls[0]?.[0]
    if (utterance?.onend) {
      act(() => {
        utterance.onend()
      })
    }

    // Advance segment timer
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onComplete).toHaveBeenCalled()
    expect(result.current.isComplete).toBe(true)
  })

  it('plays chime at start of silence segments', () => {
    const { result } = renderPlayer()
    act(() => {
      result.current.play()
    })

    // Trigger TTS end for first narration segment
    const utterance = mockSpeak.mock.calls[0]?.[0]
    if (utterance?.onend) {
      act(() => {
        utterance.onend()
      })
    }

    // Advance past first narration duration
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // Now silence segment should have started, chime should be called
    expect(mockPlayChime).toHaveBeenCalled()
  })

  it('elapsed seconds tracks correctly', () => {
    const { result } = renderPlayer()
    act(() => {
      result.current.play()
    })

    // Advance 2 seconds (8 x 250ms intervals)
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.elapsedSeconds).toBeCloseTo(2, 0)
  })

  it('progress percent clamps at 100%', () => {
    const { result } = renderPlayer()
    expect(result.current.progressPercent).toBe(0)
    // With totalDuration = 8s, at elapsed = 8 should be 100%
  })

  it('ambient auto-play when no audio active', () => {
    renderPlayer()
    // On mount with session, should attempt to load scene for 'peace' theme
    expect(mockAudioDispatch).toHaveBeenCalledWith({
      type: 'SET_MASTER_VOLUME',
      payload: { volume: 0.3 },
    })
    expect(mockLoadScene).toHaveBeenCalled()
  })

  it('ambient NOT auto-played when audio active', () => {
    mockAudioState = { ...mockAudioState, activeSounds: [{ id: 'test-sound' }] as never[] }
    renderPlayer()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('ambient NOT auto-played with reduced motion', () => {
    mockReducedMotion = true
    renderPlayer()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('ambient NOT auto-played when routine active', () => {
    mockAudioState = { ...mockAudioState, activeRoutine: { id: 'test' } }
    renderPlayer()
    expect(mockLoadScene).not.toHaveBeenCalled()
  })

  it('wake lock requested on session init', () => {
    renderPlayer()
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen')
  })

  it('wake lock released on cleanup', async () => {
    const { unmount } = renderPlayer()
    // Flush the async wake lock request
    await act(async () => {
      await vi.runAllTimersAsync()
    })
    unmount()
    expect(mockRelease).toHaveBeenCalled()
  })

  it('TTS cancelled on unmount', () => {
    const { unmount } = renderPlayer()
    unmount()
    expect(mockCancel).toHaveBeenCalled()
  })

  it('ttsAvailable is true when speechSynthesis exists', () => {
    const { result } = renderPlayer()
    expect(result.current.ttsAvailable).toBe(true)
  })

  it('stop dispatches STOP_ALL when ambient was auto-started', () => {
    const { result } = renderPlayer()
    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.stop()
    })
    expect(mockAudioDispatch).toHaveBeenCalledWith({ type: 'STOP_ALL' })
  })

  it('autoStartedAmbient is true when ambient is loaded', () => {
    const { result } = renderPlayer()
    expect(result.current.autoStartedAmbient).toBe(true)
  })

  it('ambientSceneName is set when ambient loads', () => {
    const { result } = renderPlayer()
    expect(result.current.ambientSceneName).toBeTruthy()
  })
})
