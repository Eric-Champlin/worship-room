import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import type { PlayerTrack } from '@/types/bible-audio'
import type { EngineEvents } from '@/lib/audio/engine'

// Shared mock state
type EngineStub = {
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  seek: ReturnType<typeof vi.fn>
  getCurrentTime: ReturnType<typeof vi.fn>
  getDuration: ReturnType<typeof vi.fn>
  setRate: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
  events: EngineEvents
}
const createdEngines: EngineStub[] = []
let errorMode = false

function makeEngineStub(events: EngineEvents): EngineStub {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(180),
    setRate: vi.fn(),
    destroy: vi.fn(),
    events,
  }
}

vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(async (_url: string, events: EngineEvents) => {
    const engine = makeEngineStub(events)
    createdEngines.push(engine)
    if (errorMode) {
      setTimeout(() => events.onLoadError?.('boom'), 0)
      return engine
    }
    setTimeout(() => {
      events.onLoad?.(180)
      // Simulate Howler's onplay firing after play() is called
      events.onPlay?.()
    }, 0)
    return engine
  }),
}))

vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))

const TRACK: PlayerTrack = {
  filesetId: 'EN1WEBN2DA',
  book: 'john',
  bookDisplayName: 'John',
  chapter: 3,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/JHN/3.mp3',
}

function wrapper({ children }: { children: ReactNode }) {
  return <AudioPlayerProvider>{children}</AudioPlayerProvider>
}

describe('useAudioPlayer (BB-26)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createdEngines.length = 0
    errorMode = false
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    cleanup()
  })

  it('throws when used outside provider', () => {
    // Render without provider; renderHook will throw synchronously
    expect(() => renderHook(() => useAudioPlayer())).toThrow(
      /must be used inside/,
    )
  })

  it('returns state and actions inside provider', () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    expect(result.current.state).toBeDefined()
    expect(result.current.actions).toBeDefined()
    expect(typeof result.current.actions.play).toBe('function')
    expect(typeof result.current.actions.pause).toBe('function')
    expect(typeof result.current.actions.toggle).toBe('function')
    expect(typeof result.current.actions.seek).toBe('function')
    expect(typeof result.current.actions.setSpeed).toBe('function')
    expect(typeof result.current.actions.stop).toBe('function')
    expect(typeof result.current.actions.expand).toBe('function')
    expect(typeof result.current.actions.minimize).toBe('function')
    expect(typeof result.current.actions.close).toBe('function')
    expect(typeof result.current.actions.dismissError).toBe('function')
  })

  it('state transitions: play() moves idle → loading → playing', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    expect(result.current.state.playbackState).toBe('idle')

    await act(async () => {
      await result.current.actions.play(TRACK)
    })

    // Give the setTimeout-delivered onLoad + onPlay time to fire
    await waitFor(() => {
      expect(result.current.state.playbackState).toBe('playing')
    })
    expect(result.current.state.track?.chapter).toBe(3)
    expect(result.current.state.duration).toBe(180)
  })

  it('close() moves back to idle + closed sheet', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => expect(result.current.state.playbackState).toBe('playing'))

    await act(async () => {
      result.current.actions.close()
    })
    expect(result.current.state.playbackState).toBe('idle')
    expect(result.current.state.sheetState).toBe('closed')
    expect(result.current.state.track).toBeNull()
  })

  it('setSpeed updates state and calls engine.setRate', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => expect(result.current.state.playbackState).toBe('playing'))

    await act(async () => {
      result.current.actions.setSpeed(1.5)
    })
    expect(result.current.state.playbackSpeed).toBe(1.5)
    expect(createdEngines[0].setRate).toHaveBeenCalledWith(1.5)
  })

  it('seek calls engine.seek and updates currentTime', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => expect(result.current.state.playbackState).toBe('playing'))

    await act(async () => {
      result.current.actions.seek(30)
    })
    expect(result.current.state.currentTime).toBe(30)
    expect(createdEngines[0].seek).toHaveBeenCalledWith(30)
  })

  it('LOAD_ERROR transitions to error state with message', async () => {
    errorMode = true
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => {
      expect(result.current.state.playbackState).toBe('error')
    })
    expect(result.current.state.errorMessage).toBeTruthy()
  })

  it('dismissError transitions error → idle with cleared message', async () => {
    errorMode = true
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => expect(result.current.state.playbackState).toBe('error'))

    await act(async () => {
      result.current.actions.dismissError()
    })
    expect(result.current.state.playbackState).toBe('idle')
    expect(result.current.state.errorMessage).toBeNull()
  })

  it('cross-component re-render — both consumers see the same state', async () => {
    let aState: unknown = null
    let bState: unknown = null
    let ctxApi: ReturnType<typeof useAudioPlayer> | null = null

    function A() {
      aState = useAudioPlayer().state
      return null
    }
    function B() {
      bState = useAudioPlayer().state
      return null
    }
    function Root() {
      ctxApi = useAudioPlayer()
      return (
        <>
          <A />
          <B />
        </>
      )
    }

    render(
      <AudioPlayerProvider>
        <Root />
      </AudioPlayerProvider>,
    )

    await act(async () => {
      await ctxApi!.actions.play(TRACK)
    })
    await waitFor(() => {
      expect((aState as { track?: { chapter: number } })?.track?.chapter).toBe(3)
    })
    expect((bState as { track?: { chapter: number } })?.track?.chapter).toBe(3)
  })

  it('expand/minimize transitions sheetState', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK)
    })
    await waitFor(() => expect(result.current.state.sheetState).toBe('expanded'))

    await act(async () => {
      result.current.actions.minimize()
    })
    expect(result.current.state.sheetState).toBe('minimized')

    await act(async () => {
      result.current.actions.expand()
    })
    expect(result.current.state.sheetState).toBe('expanded')
  })

  it('rapid plays — last track wins', async () => {
    const { result } = renderHook(() => useAudioPlayer(), { wrapper })

    const TRACK_B: PlayerTrack = { ...TRACK, chapter: 4 }
    const TRACK_C: PlayerTrack = { ...TRACK, chapter: 5 }

    await act(async () => {
      const pA = result.current.actions.play(TRACK)
      const pB = result.current.actions.play(TRACK_B)
      const pC = result.current.actions.play(TRACK_C)
      await Promise.allSettled([pA, pB, pC])
    })
    await waitFor(() => expect(result.current.state.track?.chapter).toBe(5))
  })
})
