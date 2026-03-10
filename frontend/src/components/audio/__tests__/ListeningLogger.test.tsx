import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListeningLogger } from '../ListeningLogger'

// ── Mocks ────────────────────────────────────────────────────────────

let mockIsLoggedIn = false
const mockLogSession = vi.fn()
let mockIsPlaying = false
let mockCurrentSceneName: string | null = null
let mockCurrentSceneId: string | null = null

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/hooks/useListeningHistory', () => ({
  useListeningHistory: () => ({
    logSession: mockLogSession,
    getLastSession: () => null,
    getRecentSessions: () => [],
  }),
}))

vi.mock('../AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    currentSceneName: mockCurrentSceneName,
    currentSceneId: mockCurrentSceneId,
    masterVolume: 0.8,
    isPlaying: mockIsPlaying,
    pillVisible: true,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
  }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('ListeningLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockIsPlaying = false
    mockCurrentSceneName = null
    mockCurrentSceneId = null
  })

  it('does not log when user is logged out', () => {
    mockIsPlaying = true
    const { rerender } = render(<ListeningLogger />)

    mockIsPlaying = false
    rerender(<ListeningLogger />)

    expect(mockLogSession).not.toHaveBeenCalled()
  })

  it('creates session when playback starts and logs when stopped', () => {
    mockIsLoggedIn = true
    mockIsPlaying = false

    const { rerender } = render(<ListeningLogger />)

    // Start playback
    mockIsPlaying = true
    rerender(<ListeningLogger />)

    // Advance time past 5 seconds
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000)

    // Stop playback
    mockIsPlaying = false
    rerender(<ListeningLogger />)

    expect(mockLogSession).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'ambient',
        contentId: 'custom-mix',
        completed: false,
      }),
    )

    vi.restoreAllMocks()
  })

  it('does not log sessions shorter than 5 seconds', () => {
    mockIsLoggedIn = true
    mockIsPlaying = false

    const { rerender } = render(<ListeningLogger />)

    // Start playback
    mockIsPlaying = true
    rerender(<ListeningLogger />)

    // Stop very quickly (less than 5 seconds)
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2000)
    mockIsPlaying = false
    rerender(<ListeningLogger />)

    expect(mockLogSession).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('detects scene content type', () => {
    mockIsLoggedIn = true
    mockIsPlaying = false
    mockCurrentSceneName = 'Morning Mist'
    mockCurrentSceneId = 'morning-mist'

    const { rerender } = render(<ListeningLogger />)

    mockIsPlaying = true
    rerender(<ListeningLogger />)

    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10000)
    mockIsPlaying = false
    rerender(<ListeningLogger />)

    expect(mockLogSession).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'scene',
        contentId: 'morning-mist',
      }),
    )

    vi.restoreAllMocks()
  })
})
