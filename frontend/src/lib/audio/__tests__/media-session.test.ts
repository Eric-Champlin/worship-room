/**
 * BB-26/BB-29 — Media Session helper tests
 *
 * BB-29 introduces the media-session.test.ts file to cover the new
 * `nexttrack` / `previoustrack` wiring added in BB-29 Step 4. The BB-26
 * tests for the shipped handlers (`play`, `pause`, `seekbackward`,
 * `seekforward`, `stop`) live inline in the provider integration suite.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearMediaSession,
  updateMediaSession,
} from '@/lib/audio/media-session'
import type {
  AudioPlayerActions,
  PlayerTrack,
} from '@/types/bible-audio'

const TRACK: PlayerTrack = {
  filesetId: 'EN1WEBN2DA',
  book: 'john',
  bookDisplayName: 'John',
  chapter: 3,
  translation: 'World English Bible',
  url: 'https://cdn.example.com/JHN/3.mp3',
}

const noopActions: AudioPlayerActions = {
  play: vi.fn(),
  pause: vi.fn(),
  toggle: vi.fn(),
  seek: vi.fn(),
  setSpeed: vi.fn(),
  stop: vi.fn(),
  expand: vi.fn(),
  minimize: vi.fn(),
  close: vi.fn(),
  dismissError: vi.fn(),
  setContinuousPlayback: vi.fn(),
  startFromGenesis: vi.fn(),
}

describe('BB-29 media-session handlers', () => {
  let setActionHandler: ReturnType<typeof vi.fn>
  let metadataSetter: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActionHandler = vi.fn()
    metadataSetter = vi.fn()

    // jsdom does not implement MediaSession; stub the bits we need.
    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        get metadata() {
          return null
        },
        set metadata(_v) {
          metadataSetter(_v)
        },
        setActionHandler,
      },
      configurable: true,
    })
    // MediaMetadata constructor stub
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).MediaMetadata = function (init: unknown) {
      return init
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // @ts-expect-error intentional cleanup
    delete (globalThis as Record<string, unknown>).MediaMetadata
    // @ts-expect-error intentional cleanup
    delete navigator.mediaSession
  })

  it('wires nexttrack handler when onNextTrack provided', () => {
    const onNextTrack = vi.fn()
    updateMediaSession(TRACK, noopActions, { onNextTrack })
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', onNextTrack)
  })

  it('nulls nexttrack handler when onNextTrack omitted', () => {
    updateMediaSession(TRACK, noopActions)
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', null)
  })

  it('wires previoustrack handler when onPrevTrack provided', () => {
    const onPrevTrack = vi.fn()
    updateMediaSession(TRACK, noopActions, { onPrevTrack })
    expect(setActionHandler).toHaveBeenCalledWith('previoustrack', onPrevTrack)
  })

  it('nulls previoustrack handler when onPrevTrack omitted', () => {
    updateMediaSession(TRACK, noopActions)
    expect(setActionHandler).toHaveBeenCalledWith('previoustrack', null)
  })

  it('clearMediaSession nulls nexttrack and previoustrack', () => {
    updateMediaSession(TRACK, noopActions, { onNextTrack: vi.fn(), onPrevTrack: vi.fn() })
    setActionHandler.mockClear()
    clearMediaSession()
    expect(setActionHandler).toHaveBeenCalledWith('nexttrack', null)
    expect(setActionHandler).toHaveBeenCalledWith('previoustrack', null)
    // Plus all the BB-26 handlers still clear
    expect(setActionHandler).toHaveBeenCalledWith('play', null)
    expect(setActionHandler).toHaveBeenCalledWith('pause', null)
    expect(setActionHandler).toHaveBeenCalledWith('seekbackward', null)
    expect(setActionHandler).toHaveBeenCalledWith('seekforward', null)
    expect(setActionHandler).toHaveBeenCalledWith('stop', null)
  })
})
