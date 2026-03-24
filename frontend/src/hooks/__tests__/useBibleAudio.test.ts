import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBibleAudio } from '../useBibleAudio'
import type { BibleVerse } from '@/types/bible'

// --- Mock SpeechSynthesis ---
const mockSpeak = vi.fn()
const mockPause = vi.fn()
const mockResume = vi.fn()
const mockCancel = vi.fn()
const mockGetVoices = vi.fn().mockReturnValue([
  { name: 'Google US English Male', lang: 'en-US' },
  { name: 'Google US English Female', lang: 'en-US' },
])

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    pause: mockPause,
    resume: mockResume,
    cancel: mockCancel,
    getVoices: mockGetVoices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
})

let lastUtterance: {
  text: string
  rate: number
  voice: unknown
  onend: (() => void) | null
  onerror: (() => void) | null
} | null = null

vi.stubGlobal(
  'SpeechSynthesisUtterance',
  class MockUtterance {
    text = ''
    rate = 1
    voice: unknown = null
    onend: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor(text: string) {
      this.text = text
      lastUtterance = this
    }
  },
)

// --- Mock Audio Provider ---
const mockAudioState = {
  activeSounds: [] as { soundId: string; volume: number; label: string; url: string }[],
  masterVolume: 0.8,
  isPlaying: false,
  pillVisible: false,
  drawerOpen: false,
  currentSceneName: null,
  foregroundContent: null,
  sleepTimer: null,
  activeRoutine: null,
}

const mockEngine = {
  setMasterVolume: vi.fn(),
}

const mockSleepTimer = {
  phase: null as string | null,
  isActive: false,
  isPaused: false,
  remainingMs: 0,
  totalDurationMs: 0,
  fadeDurationMs: 0,
  fadeStatus: 'none',
  fadeRemainingMs: 0,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  cancel: vi.fn(),
}

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => mockAudioState,
  useAudioEngine: () => mockEngine,
  useSleepTimerControls: () => mockSleepTimer,
}))

const mockDucking = {
  duckForVerse: vi.fn(),
  unduckForPause: vi.fn(),
  unduckImmediate: vi.fn(),
  unduckWithRamp: vi.fn(),
  isDucked: false,
}

vi.mock('../useAudioDucking', () => ({
  useAudioDucking: () => mockDucking,
}))

const mockSaveMeditationSession = vi.fn()
vi.mock('@/services/meditation-storage', () => ({
  saveMeditationSession: (...args: unknown[]) => mockSaveMeditationSession(...args),
}))

vi.mock('@/utils/date', () => ({
  getLocalDateString: () => '2026-03-22',
}))

// --- Test data ---
const TEST_VERSES: BibleVerse[] = [
  { number: 1, text: 'In the beginning, God created the heavens and the earth.' },
  { number: 2, text: 'The earth was formless and empty.' },
  { number: 3, text: 'God said, "Let there be light," and there was light.' },
]

const defaultOptions = {
  verses: TEST_VERSES,
  bookSlug: 'genesis',
  chapterNumber: 1,
  isAuthenticated: false,
  hasFullText: true,
  isChapterAlreadyRead: false,
  onChapterComplete: vi.fn(),
  onAnnounce: vi.fn(),
}

describe('useBibleAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    lastUtterance = null
    mockAudioState.activeSounds = []
    mockAudioState.masterVolume = 0.8
    mockSleepTimer.phase = null
    defaultOptions.isAuthenticated = false
    defaultOptions.isChapterAlreadyRead = false
    defaultOptions.onChapterComplete = vi.fn()
    defaultOptions.onAnnounce = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns isSupported: true when speechSynthesis is available', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))
    expect(result.current.isSupported).toBe(true)
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))
    expect(result.current.playbackState).toBe('idle')
    expect(result.current.currentVerseIndex).toBe(-1)
  })

  it('play starts from verse 0', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.play()
    })

    expect(mockSpeak).toHaveBeenCalledTimes(1)
    expect(lastUtterance?.text).toBe(TEST_VERSES[0].text)
    expect(result.current.playbackState).toBe('playing')
    expect(result.current.currentVerseIndex).toBe(0)
  })

  it('pause calls speechSynthesis.pause()', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.pause()
    })

    expect(mockPause).toHaveBeenCalled()
    expect(result.current.playbackState).toBe('paused')
  })

  it('stop calls speechSynthesis.cancel() and resets state', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.play()
    })
    act(() => {
      result.current.stop()
    })

    expect(mockCancel).toHaveBeenCalled()
    expect(result.current.playbackState).toBe('idle')
    expect(result.current.currentVerseIndex).toBe(-1)
  })

  it('speed change is reflected in state', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.setSpeed(1.5)
    })

    expect(result.current.speed).toBe(1.5)
  })

  it('inter-verse 300ms pause between verses', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.play()
    })

    // Complete first verse
    act(() => {
      lastUtterance?.onend?.()
    })

    // Before timeout, still at verse 0 processing
    expect(mockSpeak).toHaveBeenCalledTimes(1)

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now speak should have been called for verse 2
    expect(mockSpeak).toHaveBeenCalledTimes(2)
    expect(lastUtterance?.text).toBe(TEST_VERSES[1].text)
  })

  it('chapter completion fires on last verse end (authenticated)', () => {
    const onChapterComplete = vi.fn()
    const { result } = renderHook(() =>
      useBibleAudio({
        ...defaultOptions,
        isAuthenticated: true,
        onChapterComplete,
      }),
    )

    act(() => {
      result.current.play()
    })

    // Play through all 3 verses
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })

    expect(onChapterComplete).toHaveBeenCalledTimes(1)
  })

  it('chapter completion does NOT fire when unauthenticated', () => {
    const onChapterComplete = vi.fn()
    const { result } = renderHook(() =>
      useBibleAudio({
        ...defaultOptions,
        isAuthenticated: false,
        onChapterComplete,
      }),
    )

    act(() => {
      result.current.play()
    })

    // Play through all verses
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })

    expect(onChapterComplete).not.toHaveBeenCalled()
  })

  it('meditation session recorded on full chapter (authenticated)', () => {
    const { result } = renderHook(() =>
      useBibleAudio({
        ...defaultOptions,
        isAuthenticated: true,
      }),
    )

    act(() => {
      result.current.play()
    })

    // Play through all verses
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })
    act(() => { vi.advanceTimersByTime(300) })
    act(() => { lastUtterance?.onend?.() })

    expect(mockSaveMeditationSession).toHaveBeenCalledTimes(1)
    const session = mockSaveMeditationSession.mock.calls[0][0]
    expect(session.type).toBe('bible-audio')
    expect(session.date).toBe('2026-03-22')
    expect(session.durationMinutes).toBeGreaterThanOrEqual(1)
  })

  it('meditation session NOT recorded on partial listen', () => {
    const { result } = renderHook(() =>
      useBibleAudio({
        ...defaultOptions,
        isAuthenticated: true,
      }),
    )

    act(() => {
      result.current.play()
    })

    // Only play first verse then stop
    act(() => { lastUtterance?.onend?.() })
    act(() => {
      result.current.stop()
    })

    expect(mockSaveMeditationSession).not.toHaveBeenCalled()
  })

  it('sleep timer complete stops playback after current verse', () => {
    mockSleepTimer.phase = 'complete'

    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    act(() => {
      result.current.play()
    })

    // Complete first verse — sleep timer is complete
    act(() => {
      lastUtterance?.onend?.()
    })

    // Should not advance to next verse
    expect(result.current.playbackState).toBe('idle')
    expect(result.current.currentVerseIndex).toBe(-1)
  })

  it('cleanup cancels speech on unmount', () => {
    const { unmount } = renderHook(() => useBibleAudio(defaultOptions))

    unmount()

    expect(mockCancel).toHaveBeenCalled()
  })

  it('voice gender toggle changes voice gender state', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))

    expect(result.current.voiceGender).toBe('female')

    act(() => {
      result.current.setVoiceGender('male')
    })

    expect(result.current.voiceGender).toBe('male')
  })

  it('availableVoiceCount reflects English voices', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))
    expect(result.current.availableVoiceCount).toBe(2)
  })

  it('totalVerses matches input', () => {
    const { result } = renderHook(() => useBibleAudio(defaultOptions))
    expect(result.current.totalVerses).toBe(3)
  })

  it('announces playback state changes', () => {
    const onAnnounce = vi.fn()
    const { result } = renderHook(() =>
      useBibleAudio({ ...defaultOptions, onAnnounce }),
    )

    act(() => { result.current.play() })
    expect(onAnnounce).toHaveBeenCalledWith('Reading chapter aloud')

    act(() => { result.current.pause() })
    expect(onAnnounce).toHaveBeenCalledWith('Reading paused')

    act(() => { result.current.play() })
    expect(onAnnounce).toHaveBeenCalledWith('Reading resumed')

    act(() => { result.current.stop() })
    expect(onAnnounce).toHaveBeenCalledWith('Reading stopped')
  })

  it('does not play when hasFullText is false', () => {
    const { result } = renderHook(() =>
      useBibleAudio({ ...defaultOptions, hasFullText: false }),
    )

    act(() => {
      result.current.play()
    })

    expect(mockSpeak).not.toHaveBeenCalled()
  })

  it('does not play when verses are empty', () => {
    const { result } = renderHook(() =>
      useBibleAudio({ ...defaultOptions, verses: [] }),
    )

    act(() => {
      result.current.play()
    })

    expect(mockSpeak).not.toHaveBeenCalled()
  })
})
