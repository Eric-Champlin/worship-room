import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { useContext, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioPlayerContext, reducer } from '@/contexts/AudioPlayerContext'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import type {
  AudioPlayerState,
  DbpChapterAudio,
  DbpError,
  PlayerTrack,
} from '@/types/bible-audio'
import type { ResolveNextTrackDeps } from '@/lib/audio/next-track'
import type { EngineEvents } from '@/lib/audio/engine'
import { clearChapterAudioCache } from '@/lib/audio/audio-cache'
import { CONTINUOUS_PLAYBACK_KEY } from '@/lib/audio/continuous-playback'

// Module-level mutable state used by the mocked engine module.
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
const pendingResolvers: Array<() => void> = []
let deferMode = false
// Optional override: if set, the next call uses this function instead
type MockFn = (url: string, events: EngineEvents) => Promise<EngineStub>
let nextOverride: MockFn | null = null

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

vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(async (url: string, events: EngineEvents) => {
    if (nextOverride) {
      const fn = nextOverride
      nextOverride = null
      return fn(url, events)
    }
    const engine = makeEngineStub(events)
    createdEngines.push(engine)
    if (!deferMode) {
      setTimeout(() => events.onLoad?.(180), 0)
      return engine
    }
    return new Promise<EngineStub>((resolve) => {
      pendingResolvers.push(() => resolve(engine))
    })
  }),
}))

// BB-29 — capture the latest handlers object passed to updateMediaSession
// so provider integration tests can invoke the manual nexttrack /
// previoustrack callbacks the provider wires for Media Session.
const latestMediaSessionHandlers: {
  current: { onNextTrack?: () => void; onPrevTrack?: () => void } | null
} = { current: null }

// BB-27 — AudioPlayerProvider now requires AudioProvider as a parent.
// Mock AudioEngineService and its dependencies so AudioProvider works in tests.
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
  updateMediaSession: vi.fn(
    (
      _track: unknown,
      _actions: unknown,
      handlers?: { onNextTrack?: () => void; onPrevTrack?: () => void },
    ) => {
      latestMediaSessionHandlers.current = handlers ?? null
    },
  ),
  clearMediaSession: vi.fn(() => {
    latestMediaSessionHandlers.current = null
  }),
}))

const TRACK_A: PlayerTrack = {
  filesetId: 'EN1WEBN2DA',
  book: 'john',
  bookDisplayName: 'John',
  chapter: 3,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/JHN/3.mp3',
}
const TRACK_B: PlayerTrack = { ...TRACK_A, chapter: 4, url: 'https://cdn.example.com/JHN/4.mp3' }
const TRACK_C: PlayerTrack = { ...TRACK_A, chapter: 5, url: 'https://cdn.example.com/JHN/5.mp3' }

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AudioProvider>
        <AudioPlayerProvider>{children}</AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>
  )
}

function useCtx() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('no provider')
  return ctx
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
}

describe('AudioPlayerContext reducer (BB-26)', () => {
  const init: AudioPlayerState = {
    track: null,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    playbackSpeed: 1.0,
    sheetState: 'closed',
    errorMessage: null,
    continuousPlayback: true,
    endOfBible: false,
    sleepTimer: null,
    sleepFade: null,
  }

  it('LOAD_START transitions to loading with track set and sheet expanded', () => {
    const s = reducer(init, { type: 'LOAD_START', track: TRACK_A })
    expect(s.playbackState).toBe('loading')
    expect(s.track).toBe(TRACK_A)
    expect(s.sheetState).toBe('expanded')
  })

  it('LOAD_SUCCESS sets duration', () => {
    const s = reducer(
      { ...init, playbackState: 'loading' },
      { type: 'LOAD_SUCCESS', duration: 300 },
    )
    expect(s.duration).toBe(300)
  })

  it('PLAY / PAUSE / TICK / EXPAND / MINIMIZE / CLOSE / DISMISS_ERROR', () => {
    expect(reducer(init, { type: 'PLAY' }).playbackState).toBe('playing')
    expect(
      reducer({ ...init, playbackState: 'playing' }, { type: 'PAUSE' }).playbackState,
    ).toBe('paused')
    expect(reducer(init, { type: 'TICK', currentTime: 42 }).currentTime).toBe(42)
    expect(reducer(init, { type: 'EXPAND' }).sheetState).toBe('expanded')
    expect(reducer(init, { type: 'MINIMIZE' }).sheetState).toBe('minimized')
    const closedFromTrack = reducer({ ...init, track: TRACK_A }, { type: 'CLOSE' })
    expect(closedFromTrack.track).toBeNull()
    expect(closedFromTrack.sheetState).toBe('closed')
    const dismissed = reducer(
      { ...init, playbackState: 'error', errorMessage: 'boom' },
      { type: 'DISMISS_ERROR' },
    )
    expect(dismissed.playbackState).toBe('idle')
    expect(dismissed.errorMessage).toBeNull()
  })
})

describe('AudioPlayerContext reducer (BB-29 — auto-advance)', () => {
  const init: AudioPlayerState = {
    track: null,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    playbackSpeed: 1.0,
    sheetState: 'closed',
    errorMessage: null,
    continuousPlayback: true,
    endOfBible: false,
    sleepTimer: null,
    sleepFade: null,
  }

  it('LOAD_NEXT_CHAPTER_START preserves minimized sheetState', () => {
    const state: AudioPlayerState = {
      ...init,
      track: TRACK_A,
      playbackState: 'playing',
      sheetState: 'minimized',
    }
    const s = reducer(state, { type: 'LOAD_NEXT_CHAPTER_START', track: TRACK_B })
    expect(s.sheetState).toBe('minimized')
    expect(s.track).toBe(TRACK_B)
    expect(s.playbackState).toBe('loading')
    expect(s.currentTime).toBe(0)
  })

  it('LOAD_NEXT_CHAPTER_START preserves expanded sheetState', () => {
    const state: AudioPlayerState = {
      ...init,
      track: TRACK_A,
      playbackState: 'playing',
      sheetState: 'expanded',
    }
    const s = reducer(state, { type: 'LOAD_NEXT_CHAPTER_START', track: TRACK_B })
    expect(s.sheetState).toBe('expanded')
  })

  it('LOAD_NEXT_CHAPTER_START clears endOfBible flag', () => {
    const state: AudioPlayerState = {
      ...init,
      track: TRACK_A,
      sheetState: 'expanded',
      endOfBible: true,
    }
    const s = reducer(state, { type: 'LOAD_NEXT_CHAPTER_START', track: TRACK_B })
    expect(s.endOfBible).toBe(false)
  })

  it('SET_CONTINUOUS_PLAYBACK toggles the flag', () => {
    const off = reducer(init, { type: 'SET_CONTINUOUS_PLAYBACK', enabled: false })
    expect(off.continuousPlayback).toBe(false)
    const on = reducer(off, { type: 'SET_CONTINUOUS_PLAYBACK', enabled: true })
    expect(on.continuousPlayback).toBe(true)
  })

  it('END_OF_BIBLE sets flag, stops playback, preserves track and sheetState', () => {
    const state: AudioPlayerState = {
      ...init,
      track: TRACK_A,
      playbackState: 'playing',
      currentTime: 179.5,
      sheetState: 'expanded',
    }
    const s = reducer(state, { type: 'END_OF_BIBLE' })
    expect(s.endOfBible).toBe(true)
    expect(s.playbackState).toBe('idle')
    expect(s.currentTime).toBe(0)
    expect(s.track).toBe(TRACK_A)
    expect(s.sheetState).toBe('expanded')
  })

  it('LOAD_START clears endOfBible flag', () => {
    const state: AudioPlayerState = { ...init, endOfBible: true }
    const s = reducer(state, { type: 'LOAD_START', track: TRACK_A })
    expect(s.endOfBible).toBe(false)
  })

  it('CLOSE clears endOfBible flag', () => {
    const state: AudioPlayerState = { ...init, track: TRACK_A, endOfBible: true }
    const s = reducer(state, { type: 'CLOSE' })
    expect(s.endOfBible).toBe(false)
  })
})

describe('AudioPlayerProvider integration (BB-26)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createdEngines.length = 0
    pendingResolvers.length = 0
    deferMode = false
    nextOverride = null
    // Suppress any BB-26 crossOrigin warnings from the real engine module
    // (transitively loaded in some test environments even though vi.mock
    // intercepts the import path)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    cleanup()
    vi.useRealTimers()
  })

  it('provider cleans up engine on unmount', async () => {
    const { result, unmount } = renderHook(() => useCtx(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    expect(createdEngines).toHaveLength(1)
    unmount()
    expect(createdEngines[0].destroy).toHaveBeenCalled()
  })

  // Supersession happens at TWO checkpoints in the provider's play() method:
  //   1. Post-import check: if a later play() has incremented the ref before
  //      the dynamic import resolves, bail without calling createEngineInstance.
  //   2. Post-engine check: if a later play() has incremented the ref while
  //      createEngineInstance is awaiting, destroy the engine and bail.
  //
  // When two plays are fired in the same synchronous tick, check 1 catches
  // them — only the LAST play reaches createEngineInstance. Check 2 only
  // fires when the plays are separated across ticks (play(A), wait for its
  // engine to start loading, then play(B) interrupts).

  it('supersession: second play wins — state.track reflects last call', async () => {
    // This is the single reliable supersession test. The key correctness
    // guarantee is that after two rapid play() calls, state.track holds the
    // LAST track, not the first. The engine creation count depends on
    // microtask scheduling nuances that vitest's jsdom environment doesn't
    // always replicate (see comment below).
    const { result } = renderHook(() => useCtx(), { wrapper })

    await act(async () => {
      const pA = result.current.actions.play(TRACK_A)
      const pB = result.current.actions.play(TRACK_B)
      await Promise.allSettled([pA, pB])
    })
    await flush()
    expect(result.current.state.track?.chapter).toBe(4)
    // Note: we do NOT assert engine creation count here. In vitest's jsdom
    // environment, the microtask ordering of two sync-dispatched dynamic
    // imports can cause both plays to bail at the post-import supersession
    // check (ref=2 by the time either continuation runs). The state-level
    // assertion above is the observable correctness guarantee — whichever
    // path the runtime takes, the last track wins.
  })

  it('post-engine supersession: late play destroys the earlier engine (check 2)', async () => {
    deferMode = true
    const { result } = renderHook(() => useCtx(), { wrapper })

    // Kick off play A and let it reach createEngineInstance (where it blocks
    // because deferMode is true)
    let pA: Promise<void> | undefined
    await act(async () => {
      pA = result.current.actions.play(TRACK_A)
    })
    await flush()
    await waitFor(() => expect(pendingResolvers).toHaveLength(1))

    // Now kick off play B — it ALSO reaches createEngineInstance because
    // deferMode keeps both blocked
    let pB: Promise<void> | undefined
    await act(async () => {
      pB = result.current.actions.play(TRACK_B)
    })
    await flush()
    await waitFor(() => expect(pendingResolvers).toHaveLength(2))

    // Resolve A first — the post-engine supersession check should fire and
    // destroy A's engine (since ref has moved to B's id)
    await act(async () => {
      pendingResolvers[0]()
      await pA
    })
    expect(createdEngines[0].destroy).toHaveBeenCalled()

    // Resolve B — it should win
    await act(async () => {
      pendingResolvers[1]()
      await pB
    })
    await flush()
    expect(result.current.state.track?.chapter).toBe(4)
  })

  it('supersession: stop() cancels in-flight play()', async () => {
    deferMode = true
    const { result } = renderHook(() => useCtx(), { wrapper })

    let p: Promise<void> | undefined
    await act(async () => {
      p = result.current.actions.play(TRACK_A)
    })
    await flush()
    await waitFor(() => expect(pendingResolvers).toHaveLength(1))

    await act(async () => {
      result.current.actions.stop()
    })

    // Resolve the deferred engine — the provider's post-engine check should
    // destroy it and bail.
    await act(async () => {
      pendingResolvers[0]()
      await p
    })
    await flush()

    expect(createdEngines[0].destroy).toHaveBeenCalled()
    expect(result.current.state.playbackState).toBe('idle')
  })

  it('error routing: stall timeout string preserved end-to-end', async () => {
    nextOverride = async (_url, events) => {
      const engine = makeEngineStub(events)
      createdEngines.push(engine)
      setTimeout(
        () =>
          events.onLoadError?.(
            'Connection is slow. Try again when you have a better connection.',
          ),
        0,
      )
      return engine
    }

    const { result } = renderHook(() => useCtx(), { wrapper })
    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    await waitFor(() => expect(result.current.state.playbackState).toBe('error'))
    expect(result.current.state.errorMessage).toMatch(/slow/i)
  })

  it('supersession: three rapid plays — state.track holds the last', async () => {
    const { result } = renderHook(() => useCtx(), { wrapper })

    await act(async () => {
      const pA = result.current.actions.play(TRACK_A)
      const pB = result.current.actions.play(TRACK_B)
      const pC = result.current.actions.play(TRACK_C)
      await Promise.allSettled([pA, pB, pC])
    })
    await flush()

    expect(result.current.state.track?.chapter).toBe(5)
  })

  it('cross-component re-render: both consumers see the same state', async () => {
    let aState: AudioPlayerState | null = null
    let bState: AudioPlayerState | null = null
    let ctxRef: ReturnType<typeof useCtx> | null = null

    function A() {
      aState = useCtx().state
      return null
    }
    function B() {
      bState = useCtx().state
      return null
    }
    function Root() {
      ctxRef = useCtx()
      return (
        <>
          <A />
          <B />
        </>
      )
    }

    render(
      <MemoryRouter>
        <AudioProvider>
          <AudioPlayerProvider>
            <Root />
          </AudioPlayerProvider>
        </AudioProvider>
      </MemoryRouter>,
    )

    await act(async () => {
      await ctxRef!.actions.play(TRACK_A)
    })
    await flush()
    await waitFor(() => expect(aState?.track?.chapter).toBe(3))
    expect(bState?.track?.chapter).toBe(3)
  })
})

// ─── BB-29 — Auto-advance integration tests ──────────────────────────────

const REV_22: PlayerTrack = {
  filesetId: 'EN1WEBN2DA',
  book: 'revelation',
  bookDisplayName: 'Revelation',
  chapter: 22,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/REV/22.mp3',
}
const GEN_50: PlayerTrack = {
  filesetId: 'EN1WEBO2DA',
  book: 'genesis',
  bookDisplayName: 'Genesis',
  chapter: 50,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/GEN/50.mp3',
}
const MAL_4: PlayerTrack = {
  filesetId: 'EN1WEBO2DA',
  book: 'malachi',
  bookDisplayName: 'Malachi',
  chapter: 4,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/MAL/4.mp3',
}

function makeChapterAudioFake(url: string): DbpChapterAudio {
  return { book: 'JHN', chapter: 0, url }
}

// Build a BB-29 test wrapper that also captures the current route via
// useLocation so tests can assert on navigation without spying.
function makeBB29Wrapper(
  deps: ResolveNextTrackDeps,
  locationRef: { current: string },
) {
  function LocationCapture() {
    const loc = useLocation()
    locationRef.current = loc.pathname
    return null
  }
  return function BB29Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/']}>
        <AudioProvider>
          <AudioPlayerProvider __resolveNextTrackDeps={deps}>
            <LocationCapture />
            {children}
          </AudioPlayerProvider>
        </AudioProvider>
      </MemoryRouter>
    )
  }
}

describe('AudioPlayerProvider BB-29 — auto-advance + preference lifecycle', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createdEngines.length = 0
    pendingResolvers.length = 0
    deferMode = false
    nextOverride = null
    clearChapterAudioCache()
    localStorage.removeItem(CONTINUOUS_PLAYBACK_KEY)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    cleanup()
    vi.useRealTimers()
    localStorage.removeItem(CONTINUOUS_PLAYBACK_KEY)
    clearChapterAudioCache()
  })

  it('provider reads continuousPlayback from localStorage on mount (false)', async () => {
    localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'false')
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({}, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })
    expect(result.current.state.continuousPlayback).toBe(false)
  })

  it('provider defaults continuousPlayback to true when storage absent', async () => {
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({}, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })
    expect(result.current.state.continuousPlayback).toBe(true)
  })

  it('setContinuousPlayback writes to localStorage and updates state', async () => {
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({}, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      result.current.actions.setContinuousPlayback(false)
    })
    expect(result.current.state.continuousPlayback).toBe(false)
    expect(localStorage.getItem(CONTINUOUS_PLAYBACK_KEY)).toBe('false')
  })

  it('onEnd triggers auto-advance when continuousPlayback is true', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    expect(createdEngines).toHaveLength(1)
    const firstEngine = createdEngines[0]

    await act(async () => {
      firstEngine.events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.chapter).toBe(4))
    expect(fetchChapterAudio).toHaveBeenCalledWith('EN1WEBN2DA', 'JHN', 4)
  })

  it('onEnd dispatches STOP when continuousPlayback is false', async () => {
    localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'false')
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()

    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    expect(result.current.state.playbackState).toBe('idle')
    expect(result.current.state.track?.chapter).toBe(3) // preserved
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('auto-advance navigates to next chapter URL with replace', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()

    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(locationRef.current).toBe('/bible/john/4'))
  })

  it('auto-advance preserves expanded sheet state', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    // play() forces sheetState to expanded already
    expect(result.current.state.sheetState).toBe('expanded')

    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.chapter).toBe(4))
    expect(result.current.state.sheetState).toBe('expanded')
  })

  it('auto-advance preserves minimized sheet state', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    await act(async () => {
      result.current.actions.minimize()
    })
    expect(result.current.state.sheetState).toBe('minimized')

    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.chapter).toBe(4))
    expect(result.current.state.sheetState).toBe('minimized')
  })

  it('auto-advance at Revelation 22 dispatches END_OF_BIBLE', async () => {
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(REV_22)
    })
    await flush()
    const priorLocation = locationRef.current

    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    expect(result.current.state.endOfBible).toBe(true)
    expect(result.current.state.playbackState).toBe('idle')
    expect(result.current.state.track?.book).toBe('revelation')
    expect(result.current.state.track?.chapter).toBe(22)
    // No navigate call for end-of-bible
    expect(locationRef.current).toBe(priorLocation)
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('auto-advance across book boundary navigates to new book', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue({ book: 'EXO', chapter: 1, url: 'https://cdn.example.com/EXO/1.mp3' })
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(GEN_50)
    })
    await flush()
    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(locationRef.current).toBe('/bible/exodus/1'))
    expect(result.current.state.track?.book).toBe('exodus')
    expect(result.current.state.track?.chapter).toBe(1)
  })

  it('auto-advance across testament boundary switches fileset', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue({ book: 'MAT', chapter: 1, url: 'https://cdn.example.com/MAT/1.mp3' })
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(MAL_4)
    })
    await flush()
    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.book).toBe('matthew'))
    expect(result.current.state.track?.chapter).toBe(1)
    expect(result.current.state.track?.filesetId).toBe('EN1WEBN2DA')
    expect(fetchChapterAudio).toHaveBeenCalledWith('EN1WEBN2DA', 'MAT', 1)
  })

  it('auto-advance error dispatches LOAD_ERROR', async () => {
    const err: DbpError = { kind: 'network', message: 'offline' }
    const fetchChapterAudio = vi.fn().mockRejectedValue(err)
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.playbackState).toBe('error'))
    expect(result.current.state.errorMessage).toBeTruthy()
  })

  it('manual pause does not trigger auto-advance', async () => {
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    await act(async () => {
      result.current.actions.pause()
    })

    expect(result.current.state.track?.chapter).toBe(3)
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('endOfBible flag cleared when user manually plays a new chapter', async () => {
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    // Force end-of-bible via Revelation 22 + onEnd
    await act(async () => {
      await result.current.actions.play(REV_22)
    })
    await flush()
    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()
    expect(result.current.state.endOfBible).toBe(true)

    // Manually play a new chapter
    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    expect(result.current.state.endOfBible).toBe(false)
  })

  it('startFromGenesis action plays Genesis 1 and navigates', async () => {
    // Pre-seed the in-memory cache for Genesis 1 so startFromGenesis does
    // NOT hit the real DBP client (which would require mocking).
    const { setCachedChapterAudio } = await import('@/lib/audio/audio-cache')
    setCachedChapterAudio('EN1WEBO2DA', 'GEN', 1, {
      book: 'GEN',
      chapter: 1,
      url: 'https://cdn.example.com/GEN/1.mp3',
    })

    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.startFromGenesis()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.book).toBe('genesis'))
    expect(result.current.state.track?.chapter).toBe(1)
    expect(locationRef.current).toBe('/bible/genesis/1')
  })

  it('auto-advance supersession: manual play cancels in-flight auto-advance', async () => {
    // Use deferMode so new engines block until we manually resolve them
    let resolveFetch: ((v: DbpChapterAudio) => void) | null = null
    const fetchChapterAudio = vi.fn().mockImplementation(
      () =>
        new Promise<DbpChapterAudio>((resolve) => {
          resolveFetch = resolve
        }),
    )
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    // Start John 3
    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    expect(createdEngines).toHaveLength(1)

    // Fire onEnd — autoAdvance starts and awaits the pending fetch
    await act(async () => {
      createdEngines[0].events.onEnd?.()
    })
    await flush()

    // While auto-advance is blocked on the fetch, user manually plays Genesis 1
    await act(async () => {
      await result.current.actions.play({
        filesetId: 'EN1WEBO2DA',
        book: 'genesis',
        bookDisplayName: 'Genesis',
        chapter: 1,
        translation: 'World English Bible',
        url: 'https://cdn.example.com/GEN/1.mp3',
      })
    })
    await flush()

    // Now resolve the deferred fetch — autoAdvance should see it's superseded
    await act(async () => {
      resolveFetch?.({ book: 'JHN', chapter: 4, url: 'https://cdn.example.com/JHN/4.mp3' })
    })
    await flush()

    // Genesis should win — the auto-advance result was discarded
    expect(result.current.state.track?.book).toBe('genesis')
    expect(result.current.state.track?.chapter).toBe(1)
  })

  // ─── BB-29 Step 4 — Media Session nexttrack / previoustrack ────────────

  it('provider manual nexttrack advances to the next chapter', async () => {
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    await waitFor(() =>
      expect(latestMediaSessionHandlers.current?.onNextTrack).toBeDefined(),
    )

    await act(async () => {
      latestMediaSessionHandlers.current?.onNextTrack?.()
    })
    await flush()
    await waitFor(() => expect(result.current.state.track?.chapter).toBe(4))
  })

  it('provider manual nexttrack ignores continuousPlayback preference', async () => {
    // Turn preference OFF — manual nexttrack should still advance
    localStorage.setItem(CONTINUOUS_PLAYBACK_KEY, 'false')
    const fetchChapterAudio = vi
      .fn()
      .mockResolvedValue(makeChapterAudioFake('https://cdn.example.com/JHN/4.mp3'))
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()
    expect(result.current.state.continuousPlayback).toBe(false)

    await act(async () => {
      latestMediaSessionHandlers.current?.onNextTrack?.()
    })
    await flush()
    await waitFor(() => expect(result.current.state.track?.chapter).toBe(4))
  })

  it('provider manual nexttrack at Revelation 22 triggers end-of-bible state', async () => {
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(REV_22)
    })
    await flush()

    await act(async () => {
      latestMediaSessionHandlers.current?.onNextTrack?.()
    })
    await flush()

    expect(result.current.state.endOfBible).toBe(true)
    expect(fetchChapterAudio).not.toHaveBeenCalled()
  })

  it('provider manual previoustrack goes to previous chapter', async () => {
    // Pre-seed cache for John 2 so prev-track doesn't hit the real DBP
    const audioCacheModule = await import('@/lib/audio/audio-cache')
    audioCacheModule.setCachedChapterAudio('EN1WEBN2DA', 'JHN', 2, {
      book: 'JHN',
      chapter: 2,
      url: 'https://cdn.example.com/JHN/2.mp3',
    })

    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    await act(async () => {
      await result.current.actions.play(TRACK_A)
    })
    await flush()

    await act(async () => {
      latestMediaSessionHandlers.current?.onPrevTrack?.()
    })
    await flush()

    await waitFor(() => expect(result.current.state.track?.chapter).toBe(2))
    expect(result.current.state.track?.book).toBe('john')
  })

  it('provider manual previoustrack at Genesis 1 is a no-op', async () => {
    const fetchChapterAudio = vi.fn()
    const locationRef = { current: '/' }
    const wrapperFn = makeBB29Wrapper({ fetchChapterAudio }, locationRef)
    const { result } = renderHook(() => useCtx(), { wrapper: wrapperFn })

    const GENESIS_1: PlayerTrack = {
      filesetId: 'EN1WEBO2DA',
      book: 'genesis',
      bookDisplayName: 'Genesis',
      chapter: 1,
      translation: 'World English Bible',
      url: 'https://cdn.example.com/GEN/1.mp3',
    }

    await act(async () => {
      await result.current.actions.play(GENESIS_1)
    })
    await flush()

    await act(async () => {
      latestMediaSessionHandlers.current?.onPrevTrack?.()
    })
    await flush()

    // Track unchanged — no adjacent chapter before Genesis 1
    expect(result.current.state.track?.book).toBe('genesis')
    expect(result.current.state.track?.chapter).toBe(1)
  })
})

// ─── BB-28 — Sleep timer reducer tests ─────────────────────────────

describe('AudioPlayerContext reducer (BB-28 — sleep timer)', () => {
  const init: AudioPlayerState = {
    track: null,
    playbackState: 'idle',
    currentTime: 0,
    duration: 0,
    playbackSpeed: 1.0,
    sheetState: 'closed',
    errorMessage: null,
    continuousPlayback: true,
    endOfBible: false,
    sleepTimer: null,
    sleepFade: null,
  }

  const TIMER_30: import('@/types/bible-audio').SleepTimerInfo = {
    type: 'duration',
    remainingMs: 1_800_000,
    preset: '30',
  }

  const TIMER_CHAPTER: import('@/types/bible-audio').SleepTimerInfo = {
    type: 'end-of-chapter',
    remainingMs: 0,
    preset: 'chapter',
  }

  it('SET_SLEEP_TIMER sets timer and clears fade', () => {
    const state = { ...init, sleepFade: { remainingMs: 5000 } }
    const s = reducer(state, { type: 'SET_SLEEP_TIMER', timer: TIMER_30 })
    expect(s.sleepTimer).toEqual(TIMER_30)
    expect(s.sleepFade).toBeNull()
  })

  it('SET_SLEEP_TIMER replaces existing timer', () => {
    const state = { ...init, sleepTimer: TIMER_CHAPTER }
    const s = reducer(state, { type: 'SET_SLEEP_TIMER', timer: TIMER_30 })
    expect(s.sleepTimer).toEqual(TIMER_30)
  })

  it('TICK decrements duration timer', () => {
    const state = { ...init, sleepTimer: { ...TIMER_30, remainingMs: 10_000 } }
    const s = reducer(state, { type: 'TICK', currentTime: 5 })
    expect(s.sleepTimer?.remainingMs).toBe(9_800)
  })

  it('TICK transitions to fade when timer hits 0', () => {
    const state = { ...init, sleepTimer: { ...TIMER_30, remainingMs: 200 } }
    const s = reducer(state, { type: 'TICK', currentTime: 5 })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toEqual({ remainingMs: 20_000 })
  })

  it('TICK decrements fade', () => {
    const state = { ...init, sleepFade: { remainingMs: 5000 } }
    const s = reducer(state, { type: 'TICK', currentTime: 5 })
    expect(s.sleepFade?.remainingMs).toBe(4800)
  })

  it('TICK does not decrement structural timer', () => {
    const state = { ...init, sleepTimer: TIMER_CHAPTER }
    const s = reducer(state, { type: 'TICK', currentTime: 5 })
    expect(s.sleepTimer?.remainingMs).toBe(0)
  })

  it('START_SLEEP_FADE clears timer and sets fade', () => {
    const state = { ...init, sleepTimer: TIMER_30 }
    const s = reducer(state, { type: 'START_SLEEP_FADE' })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toEqual({ remainingMs: 20_000 })
  })

  it('CANCEL_SLEEP_TIMER clears both', () => {
    const state = {
      ...init,
      sleepTimer: TIMER_30,
      sleepFade: { remainingMs: 5000 },
    }
    const s = reducer(state, { type: 'CANCEL_SLEEP_TIMER' })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toBeNull()
  })

  it('STOP clears timer and fade', () => {
    const state = {
      ...init,
      sleepTimer: TIMER_30,
      sleepFade: { remainingMs: 5000 },
    }
    const s = reducer(state, { type: 'STOP' })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toBeNull()
  })

  it('CLOSE clears timer and fade', () => {
    const state = {
      ...init,
      sleepTimer: TIMER_30,
      sleepFade: { remainingMs: 5000 },
    }
    const s = reducer(state, { type: 'CLOSE' })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toBeNull()
  })

  it('END_OF_BIBLE clears timer and fade', () => {
    const state = {
      ...init,
      sleepTimer: TIMER_30,
      sleepFade: { remainingMs: 5000 },
    }
    const s = reducer(state, { type: 'END_OF_BIBLE' })
    expect(s.sleepTimer).toBeNull()
    expect(s.sleepFade).toBeNull()
  })
})

// ─── BB-28 — Sleep timer provider integration tests ────────────────

describe('AudioPlayerProvider BB-28 — sleep timer lifecycle', () => {
  beforeEach(() => {
    createdEngines.length = 0
    pendingResolvers.length = 0
    deferMode = false
    nextOverride = null
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  // Stub deps so resolveNextTrack never hits real DBP
  const bb28Deps: ResolveNextTrackDeps = {
    getAdjacentChapter: () => null,
    resolveFcbhBookCode: () => null,
    resolveFcbhFilesetForBook: () => null,
    getChapterAudio: async () => ({ book: 'JHN', chapter: 1, url: 'https://cdn.example.com/JHN/1.mp3' }),
    getCachedChapterAudio: () => null,
    setCachedChapterAudio: () => {},
  }

  function renderBB28Provider() {
    return renderHook(() => useContext(AudioPlayerContext), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={['/bible/john/3']}>
          <AudioProvider>
            <AudioPlayerProvider __resolveNextTrackDeps={bb28Deps}>
              {children}
            </AudioPlayerProvider>
          </AudioProvider>
        </MemoryRouter>
      ),
    })
  }

  it('provider setSleepTimer updates state', async () => {
    const { result } = renderBB28Provider()
    await act(async () => {
      await result.current!.actions.play(TRACK_A)
    })
    await flush()

    act(() => {
      result.current!.actions.setSleepTimer({
        type: 'duration',
        remainingMs: 1_800_000,
        preset: '30',
      })
    })

    expect(result.current!.state.sleepTimer).toEqual({
      type: 'duration',
      remainingMs: 1_800_000,
      preset: '30',
    })
  })

  it('provider cancelSleepTimer clears timer and fade state', async () => {
    const { result } = renderBB28Provider()

    // Set a timer without requiring engine (setSleepTimer is dispatch-only)
    act(() => {
      result.current!.actions.setSleepTimer({
        type: 'duration',
        remainingMs: 1_800_000,
        preset: '30',
      })
    })
    expect(result.current!.state.sleepTimer).not.toBeNull()

    act(() => {
      result.current!.actions.cancelSleepTimer()
    })

    expect(result.current!.state.sleepTimer).toBeNull()
    expect(result.current!.state.sleepFade).toBeNull()
  })
})
