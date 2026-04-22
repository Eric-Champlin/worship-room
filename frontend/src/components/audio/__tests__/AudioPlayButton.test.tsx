import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AudioProvider } from '@/components/audio/AudioProvider'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { useAudioPlayer } from '@/hooks/audio/useAudioPlayer'
import type { AudioPlayerActions } from '@/types/bible-audio'
import type { EngineEvents } from '@/lib/audio/engine'

// Spec 4: mock backend readiness probe + audio-cache + dbp-client.
// The readiness probe replaces the synchronous env-key check.
const hoisted = vi.hoisted(() => ({
  getFcbhReadiness: vi.fn(),
  loadAudioBibles: vi.fn(),
  getChapterAudio: vi.fn(),
}))

vi.mock('@/services/fcbh-readiness', () => ({
  getFcbhReadiness: hoisted.getFcbhReadiness,
  resetFcbhReadinessCache: vi.fn(),
}))
vi.mock('@/lib/audio/audio-cache', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    loadAudioBibles: hoisted.loadAudioBibles,
    getCachedChapterAudio: vi.fn().mockReturnValue(undefined),
    setCachedChapterAudio: vi.fn(),
  }
})
vi.mock('@/lib/audio/dbp-client', () => ({
  getChapterAudio: hoisted.getChapterAudio,
  getChapterTimestamps: vi.fn().mockResolvedValue([]),
}))
// BB-27 — AudioPlayerProvider requires AudioProvider; mock its deps
vi.mock('@/lib/audio-engine', () => {
  class MockAudioEngineService {
    ensureContext = vi.fn(); addSound = vi.fn().mockResolvedValue(undefined)
    removeSound = vi.fn(); setSoundVolume = vi.fn(); setMasterVolume = vi.fn()
    playForeground = vi.fn(); seekForeground = vi.fn(); setForegroundBalance = vi.fn()
    pauseAll = vi.fn(); resumeAll = vi.fn(); stopAll = vi.fn()
    getSoundCount = vi.fn(() => 0); getForegroundElement = vi.fn(() => null)
  }
  return { AudioEngineService: MockAudioEngineService }
})
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))
vi.mock('@/lib/audio/engine', () => ({
  createEngineInstance: vi.fn(async (_url: string, events: EngineEvents) => {
    setTimeout(() => {
      events.onLoad?.(180)
      events.onPlay?.()
    }, 0)
    return {
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getDuration: vi.fn().mockReturnValue(180),
      setRate: vi.fn(),
      destroy: vi.fn(),
    }
  }),
}))
vi.mock('@/lib/audio/media-session', () => ({
  updateMediaSession: vi.fn(),
  clearMediaSession: vi.fn(),
}))

import { AudioPlayButton } from '@/components/audio/AudioPlayButton'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AudioProvider>
        <AudioPlayerProvider>{children}</AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>
  )
}

/**
 * Render children inside AudioPlayerProvider and expose the player actions
 * via a ref object so tests can drive state transitions externally (e.g.
 * call actions.close() after the sheet opens).
 */
function renderWithActions(children: ReactNode) {
  const actionsRef: { current: AudioPlayerActions | null } = { current: null }
  function Harness() {
    const { actions } = useAudioPlayer()
    actionsRef.current = actions
    return null
  }
  const rendered = render(
    <MemoryRouter>
      <AudioProvider>
        <AudioPlayerProvider>
          <Harness />
          {children}
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
  return { ...rendered, actionsRef }
}

/** Flush one requestAnimationFrame tick. */
async function flushRAF() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('AudioPlayButton (BB-26)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    hoisted.getFcbhReadiness.mockReset()
    hoisted.loadAudioBibles.mockReset()
    hoisted.getChapterAudio.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    cleanup()
  })

  it('renders nothing when FCBH key is not configured', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(false)
    render(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
      { wrapper },
    )
    // No button rendered
    expect(screen.queryByTestId('audio-play-button')).toBeNull()
  })

  it('renders nothing when DBP fetch fails', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockRejectedValue(
      Object.assign(new Error('boom'), { kind: 'network' }),
    )
    render(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
      { wrapper },
    )
    await waitFor(() =>
      expect(hoisted.loadAudioBibles).toHaveBeenCalled(),
    )
    // Still no button
    expect(screen.queryByTestId('audio-play-button')).toBeNull()
  })

  it('renders nothing for an unknown book slug', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    render(
      <AudioPlayButton bookSlug="not-a-book" bookDisplayName="Nope" chapter={1} />,
      { wrapper },
    )
    expect(screen.queryByTestId('audio-play-button')).toBeNull()
  })

  it('renders play icon with book-specific aria-label when audio is available', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })
    render(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
      { wrapper },
    )
    const btn = await screen.findByRole('button', { name: 'Play audio for John 3' })
    expect(btn).toBeInTheDocument()
  })

  it('calls getChapterAudio with the correct DBP book code and fileset', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })
    render(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
      { wrapper },
    )
    await waitFor(() =>
      expect(hoisted.getChapterAudio).toHaveBeenCalledWith('EN1WEBN2DA', 'JHN', 3),
    )
  })

  it('calls EN1WEBO2DA for OT books', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'GEN',
      chapter: 1,
      url: 'https://cdn.example.com/GEN/1.mp3',
    })
    render(
      <AudioPlayButton bookSlug="genesis" bookDisplayName="Genesis" chapter={1} />,
      { wrapper },
    )
    await waitFor(() =>
      expect(hoisted.getChapterAudio).toHaveBeenCalledWith('EN1WEBO2DA', 'GEN', 1),
    )
  })

  it('focus returns to AudioPlayButton after sheet closes', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })

    const user = userEvent.setup()
    const { actionsRef } = renderWithActions(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
    )
    const btn = await screen.findByRole('button', { name: 'Play audio for John 3' })

    // Open the sheet by clicking play.
    await act(async () => {
      await user.click(btn)
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Pause audio' }),
      ).toBeInTheDocument()
    })

    // Move focus to a probe element so we can prove the effect restored it.
    const probe = document.createElement('input')
    document.body.appendChild(probe)
    probe.focus()
    expect(document.activeElement).toBe(probe)

    // Close the sheet via actions.close() — simulates the X click path.
    await act(async () => {
      actionsRef.current?.close()
    })
    await flushRAF()

    // The same button (now rendered in idle state with "Play audio for John 3"
    // label) should have received focus.
    const restoredBtn = screen.getByTestId('audio-play-button')
    expect(document.activeElement).toBe(restoredBtn)
    probe.remove()
  })

  it('focus does not return to AudioPlayButton if the user navigated to a different chapter before close', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockImplementation(async (_fileset, book, ch) => ({
      book,
      chapter: ch,
      url: `https://cdn.example.com/${book}/${ch}.mp3`,
    }))

    const user = userEvent.setup()
    const { rerender, actionsRef } = renderWithActions(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
    )
    const btn3 = await screen.findByRole('button', { name: 'Play audio for John 3' })

    // Open sheet for John 3.
    await act(async () => {
      await user.click(btn3)
    })
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Pause audio' }),
      ).toBeInTheDocument()
    })

    // Simulate chapter navigation: the same AudioPlayerProvider stays
    // mounted (state preserved), but the AudioPlayButton now renders for
    // John 4. Re-use the same harness so actionsRef still points at the
    // live provider.
    function Harness() {
      const { actions } = useAudioPlayer()
      actionsRef.current = actions
      return null
    }
    rerender(
      <MemoryRouter>
        <AudioProvider>
          <AudioPlayerProvider>
            <Harness />
            <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={4} />
          </AudioPlayerProvider>
        </AudioProvider>
      </MemoryRouter>,
    )
    // Wait for the new chapter's DBP lookup + re-render.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Play audio for John 4' }),
      ).toBeInTheDocument()
    })

    // Park focus on a probe element so we can prove nothing steals it.
    const probe = document.createElement('input')
    document.body.appendChild(probe)
    probe.focus()
    expect(document.activeElement).toBe(probe)

    // Close the sheet. The previously-playing track was John 3; the
    // current button is John 4. The guard in AudioPlayButton must NOT
    // let this instance grab focus.
    await act(async () => {
      actionsRef.current?.close()
    })
    await flushRAF()

    const john4Btn = screen.getByTestId('audio-play-button')
    expect(document.activeElement).not.toBe(john4Btn)
    expect(document.activeElement).toBe(probe)
    probe.remove()
  })

  it('click when idle triggers actions.play with correct track', async () => {
    hoisted.getFcbhReadiness.mockResolvedValue(true)
    hoisted.loadAudioBibles.mockResolvedValue([])
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })

    const user = userEvent.setup()
    render(
      <AudioPlayButton bookSlug="john" bookDisplayName="John" chapter={3} />,
      { wrapper },
    )
    const btn = await screen.findByRole('button', { name: 'Play audio for John 3' })
    await act(async () => {
      await user.click(btn)
    })
    // After click, play was dispatched — verify by label change to Pause.
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Pause audio' }),
      ).toBeInTheDocument()
    })
  })
})
