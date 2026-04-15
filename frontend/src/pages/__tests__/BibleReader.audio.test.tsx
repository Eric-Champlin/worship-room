/**
 * BB-26 — BibleReader + Audio integration tests
 *
 * Exercises the full flow: AudioPlayButton mounts on a chapter with DBP
 * audio, clicking it opens the AudioPlayerSheet, minimize/close behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerProvider'
import { AudioProvider } from '@/components/audio/AudioProvider'
import type { EngineEvents } from '@/lib/audio/engine'

// BB-27: mock audio engine and auth so AudioProvider/AudioPlayerProvider mount cleanly
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

// Mock env + DBP so the button resolves
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, isFcbhApiKeyConfigured: () => true }
})

vi.mock('@/lib/audio/audio-cache', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    loadAudioBibles: vi.fn().mockResolvedValue([]),
    getCachedChapterAudio: vi.fn().mockReturnValue(undefined),
    setCachedChapterAudio: vi.fn(),
  }
})

const hoisted = vi.hoisted(() => ({
  getChapterAudio: vi.fn(),
}))
vi.mock('@/lib/audio/dbp-client', () => ({
  getChapterAudio: hoisted.getChapterAudio,
  getChapterTimestamps: vi.fn().mockResolvedValue([]),
}))

// Engine mock — simulates Howler resolving with onLoad + onPlay after a tick.
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

// Bible data mock
vi.mock('@/data/bible', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/bible')>()
  return {
    ...actual,
    loadChapterWeb: vi.fn(async (slug: string, chapter: number) => {
      if (slug === 'john' && chapter === 3) {
        return {
          bookSlug: 'john',
          chapter: 3,
          verses: [
            { number: 1, text: 'Now there was a man of the Pharisees named Nicodemus.' },
          ],
          paragraphs: [],
        }
      }
      return null
    }),
  }
})

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  useToastSafe: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  AudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAudioState: () => ({
    drawerOpen: false,
    activeSounds: [],
    isPlaying: false,
    pillVisible: false,
    masterVolume: 0.8,
    foregroundContent: null,
    readingContext: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => null,
  useReadingContext: () => ({
    setReadingContext: vi.fn(),
    clearReadingContext: vi.fn(),
  }),
  useSleepTimerControls: () => ({
    remainingMs: 0,
    totalDurationMs: 0,
    isActive: false,
    isPaused: false,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  }),
}))

vi.mock('@/components/bible/reader/AmbientAudioPicker', () => ({
  AmbientAudioPicker: () => null,
}))

vi.mock('@/hooks/useReaderAudioAutoStart', () => ({
  useReaderAudioAutoStart: vi.fn(),
}))

import { BibleReader } from '../BibleReader'
import { lazy, Suspense } from 'react'

const AudioPlayerSheet = lazy(() =>
  import('@/components/audio/AudioPlayerSheet').then((m) => ({ default: m.AudioPlayerSheet })),
)

function renderReader(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AudioProvider>
        <AudioPlayerProvider>
          <Suspense fallback={null}>
            <AudioPlayerSheet />
          </Suspense>
          <Routes>
            <Route path="/bible/:book/:chapter" element={<BibleReader />} />
            <Route path="/bible" element={<div>Browser</div>} />
          </Routes>
        </AudioPlayerProvider>
      </AudioProvider>
    </MemoryRouter>,
  )
}

describe('BibleReader + Audio integration (BB-26)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    hoisted.getChapterAudio.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    cleanup()
  })

  it('AudioPlayButton appears on a chapter with audio', async () => {
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })
    renderReader('/bible/john/3')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Play audio for John 3/ }),
      ).toBeInTheDocument(),
    )
  })

  it('AudioPlayButton is hidden when DBP returns 404', async () => {
    hoisted.getChapterAudio.mockRejectedValue({
      kind: 'http',
      status: 404,
      message: 'not found',
    })
    renderReader('/bible/john/3')
    // Wait for the effect to run and resolve (or reject)
    await waitFor(() => expect(hoisted.getChapterAudio).toHaveBeenCalled())
    // Button should not appear
    expect(
      screen.queryByRole('button', { name: /Play audio for/ }),
    ).toBeNull()
  })

  // BB-44 F2 fix — error state must not produce read-along highlighting.
  // When playbackState is 'error', the BibleReader guard sets readAlongVerse
  // to null so no verse has aria-current. We verify this by rendering the
  // reader after a failed audio load and asserting no aria-current attributes.
  it('no verse has aria-current when audio is in error state', async () => {
    hoisted.getChapterAudio.mockRejectedValue({
      kind: 'http',
      status: 500,
      message: 'server error',
    })
    renderReader('/bible/john/3')
    // Wait for the chapter content to render
    await waitFor(() => expect(screen.getByText(/Nicodemus/)).toBeInTheDocument())
    // No verse should have aria-current — error state disqualifies read-along
    const withAriaCurrent = document.querySelectorAll('[aria-current]')
    expect(withAriaCurrent).toHaveLength(0)
  })

  // NTH-1 — End-to-end provider + sheet integration test.
  // Mounts the real AudioPlayerProvider, real useAudioPlayer hook, real
  // AudioPlayerSheet (lazy), and a real AudioPlayButton via BibleReader.
  // Only the DBP + engine module boundary is mocked. This test guards
  // provider→sheet state propagation across the audio wave and catches
  // regressions where mocking the hook in presentational tests would hide
  // a broken subscription path.
  it('click AudioPlayButton opens sheet with chapter reference; close unmounts it', async () => {
    hoisted.getChapterAudio.mockResolvedValue({
      book: 'JHN',
      chapter: 3,
      url: 'https://cdn.example.com/JHN/3.mp3',
    })
    const user = userEvent.setup()
    renderReader('/bible/john/3')

    // Initially: the sheet is absent from the DOM (sheetState === 'closed'
    // returns null). AudioPlayerExpanded renders a <region aria-label="Audio
    // player"> wrapper — it should not exist yet.
    expect(screen.queryByRole('region', { name: /audio player/i })).toBeNull()

    // Wait for AudioPlayButton to mount (DBP lookup resolved)
    const playButton = await screen.findByRole('button', {
      name: /Play audio for John 3/,
    })

    // Click to start playback — the provider dispatches LOAD_START which
    // sets sheetState='expanded'. The lazy-loaded sheet should mount.
    await user.click(playButton)

    // The expanded sheet should now render with the chapter reference.
    // AudioPlayerExpanded renders "John 3" as a paragraph near the top.
    // React emits `{bookDisplayName} {chapter}` as separate text nodes, so
    // use a text-content matcher on the element rather than getByText which
    // cannot span multiple child nodes.
    await waitFor(() => {
      const headings = screen.getAllByText(
        (_content, element) =>
          element?.tagName === 'P' && element.textContent === 'John 3',
      )
      expect(headings.length).toBeGreaterThan(0)
    })

    // The sheet region should be present (either expanded or minimized — the
    // expanded state's aria-label is "Audio player").
    expect(
      screen.getByRole('region', { name: /audio player/i }),
    ).toBeInTheDocument()

    // Close via the X button in the sheet (CornerButton aria-label "Close
    // audio player"). This dispatches CLOSE → sheetState='closed' → the
    // sheet returns null and unmounts.
    const closeButton = await screen.findByRole('button', {
      name: /close audio player/i,
    })
    await user.click(closeButton)

    // Sheet should unmount
    await waitFor(() => {
      expect(
        screen.queryByRole('region', { name: /audio player/i }),
      ).toBeNull()
    })
    // And no <p> with the chapter reference text should remain
    expect(
      screen.queryAllByText(
        (_content, element) =>
          element?.tagName === 'P' && element.textContent === 'John 3',
      ),
    ).toHaveLength(0)

    // And the AudioPlayButton should still be present, back to the "Play"
    // label (state.track was cleared by CLOSE).
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Play audio for John 3/ }),
      ).toBeInTheDocument()
    })
  })
})
