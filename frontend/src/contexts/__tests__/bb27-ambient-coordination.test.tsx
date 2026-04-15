/**
 * BB-27 — Ambient audio pause coordination integration tests
 *
 * These tests mount both AudioProvider (ambient) and AudioPlayerProvider
 * (Bible) together to verify the full coordination lifecycle. The audio
 * engine is mocked (no real AudioContext in jsdom), but the reducers and
 * dispatchers are real.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useContext, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AudioProvider, useAudioState, useAudioDispatch } from '@/components/audio/AudioProvider'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { AudioPlayerContext } from '@/contexts/AudioPlayerContext'
import type { EngineEvents } from '@/lib/audio/engine'
import type { PlayerTrack } from '@/types/bible-audio'

// ─── Mocks ──────────────────────────────────────────────────────────

type EngineStub = {
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  seek: ReturnType<typeof vi.fn>
  getCurrentTime: ReturnType<typeof vi.fn>
  getDuration: ReturnType<typeof vi.fn>
  setRate: ReturnType<typeof vi.fn>
  setVolume: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  events: EngineEvents
}

const createdEngines: EngineStub[] = []

function makeEngineStub(events: EngineEvents): EngineStub {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(180),
    setRate: vi.fn(),
    setVolume: vi.fn(),
    destroy: vi.fn(),
    events,
  }
}

// Bible audio engine (Howler wrapper)
vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(async (_url: string, events: EngineEvents) => {
    const engine = makeEngineStub(events)
    createdEngines.push(engine)
    setTimeout(() => events.onLoad?.(180), 0)
    return engine
  }),
}))

// Ambient audio engine (Web Audio API)
vi.mock('@/lib/audio-engine', () => {
  class MockAudioEngineService {
    ensureContext = vi.fn()
    addSound = vi.fn().mockResolvedValue(undefined)
    removeSound = vi.fn()
    setSoundVolume = vi.fn()
    setMasterVolume = vi.fn()
    playForeground = vi.fn()
    seekForeground = vi.fn()
    setForegroundBalance = vi.fn()
    pauseAll = vi.fn()
    resumeAll = vi.fn()
    stopAll = vi.fn()
    getSoundCount = vi.fn(() => 0)
    getForegroundElement = vi.fn(() => null)
  }
  return { AudioEngineService: MockAudioEngineService }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))

// ─── Test constants ─────────────────────────────────────────────────

const TRACK: PlayerTrack = {
  filesetId: 'EN1WEBN2DA',
  book: 'john',
  bookDisplayName: 'John',
  chapter: 3,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/JHN/3.mp3',
}

// ─── Wrapper & helpers ──────────────────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AudioProvider>
        <AudioPlayerProvider>
          {children}
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>
  )
}

function useBothContexts() {
  const ambientState = useAudioState()
  const ambientDispatch = useAudioDispatch()
  const bibleCtx = useContext(AudioPlayerContext)
  if (!bibleCtx) throw new Error('no AudioPlayerContext')
  return { ambientState, ambientDispatch, bibleState: bibleCtx.state, bibleActions: bibleCtx.actions }
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('BB-27 — ambient audio pause coordination', () => {
  beforeEach(() => {
    createdEngines.length = 0
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('ambient pauses when Bible starts', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start ambient
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    expect(result.current.ambientState.isPlaying).toBe(true)
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()

    // Start Bible audio
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()

    // Ambient should be paused with snapshot captured
    expect(result.current.ambientState.isPlaying).toBe(false)
    expect(result.current.ambientState.pausedByBibleAudio).not.toBeNull()
    expect(result.current.ambientState.pausedByBibleAudio?.activeSounds).toHaveLength(1)
    expect(result.current.ambientState.pausedByBibleAudio?.activeSounds[0].soundId).toBe('rain')
    // activeSounds preserved (not removed)
    expect(result.current.ambientState.activeSounds).toHaveLength(1)
  })

  it('ambient resumes when Bible stops', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start ambient + Bible
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()
    expect(result.current.ambientState.isPlaying).toBe(false)

    // Close Bible
    act(() => {
      result.current.bibleActions.close()
    })
    await flush()

    // Ambient should resume
    expect(result.current.ambientState.isPlaying).toBe(true)
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()
  })

  it('no-op when no ambient playing', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start Bible without ambient
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()

    // pausedByBibleAudio should remain null
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()
  })

  it('user override clears snapshot — user sound persists after Bible stops', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start rain + Bible (rain pauses)
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()
    expect(result.current.ambientState.pausedByBibleAudio).not.toBeNull()

    // User manually adds a different sound (override)
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'waves', volume: 0.5, label: 'Waves', url: '/audio/waves.mp3' },
      })
    })
    // Snapshot should be cleared
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()

    // Close Bible
    act(() => {
      result.current.bibleActions.close()
    })
    await flush()

    // Ambient should still have waves (no auto-restore to rain)
    expect(result.current.ambientState.activeSounds.some((s) => s.soundId === 'waves')).toBe(true)
  })

  it('user manual pause overrides coordination', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start rain + Bible (rain pauses via coordination)
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()

    // User manually pauses ambient (clears snapshot)
    act(() => {
      result.current.ambientDispatch({ type: 'PAUSE_ALL' })
    })
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()

    // Close Bible
    act(() => {
      result.current.bibleActions.close()
    })
    await flush()

    // Ambient should remain paused (not auto-resumed)
    expect(result.current.ambientState.isPlaying).toBe(false)
  })

  it('Bible pause mid-chapter does NOT resume ambient', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start rain + Bible
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()
    // Fire onPlay to transition loading → playing (mock engine
    // doesn't auto-fire callbacks when play() is called)
    act(() => {
      createdEngines[0].events.onPlay?.()
    })
    expect(result.current.bibleState.playbackState).toBe('playing')

    // Pause Bible (momentary) — trigger the engine's onPause callback
    act(() => {
      createdEngines[0].events.onPause?.()
    })
    await flush()
    expect(result.current.bibleState.playbackState).toBe('paused')

    // Ambient should still be paused (snapshot intact)
    expect(result.current.ambientState.isPlaying).toBe(false)
    expect(result.current.ambientState.pausedByBibleAudio).not.toBeNull()
  })

  it('error + dismiss error lifecycle', async () => {
    const { result } = renderHook(() => useBothContexts(), { wrapper: Wrapper })

    // Start rain + Bible
    act(() => {
      result.current.ambientDispatch({
        type: 'ADD_SOUND',
        payload: { soundId: 'rain', volume: 0.6, label: 'Rain', url: '/audio/rain.mp3' },
      })
    })
    await act(async () => {
      await result.current.bibleActions.play(TRACK)
    })
    await flush()

    // Trigger error on the engine
    act(() => {
      createdEngines[0].events.onLoadError?.('network error')
    })
    await flush()

    // Ambient stays paused during error state
    expect(result.current.ambientState.isPlaying).toBe(false)
    expect(result.current.ambientState.pausedByBibleAudio).not.toBeNull()

    // Dismiss error → back to idle → resume ambient
    act(() => {
      result.current.bibleActions.dismissError()
    })
    await flush()

    expect(result.current.ambientState.isPlaying).toBe(true)
    expect(result.current.ambientState.pausedByBibleAudio).toBeNull()
  })
})
