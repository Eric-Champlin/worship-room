import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getGettingStartedData } from '@/services/getting-started-storage'

// Mock audio provider for MusicPage
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: vi.fn(() => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
  })),
  useAudioDispatch: vi.fn(() => vi.fn()),
  useAudioEngine: vi.fn(() => ({
    addSound: vi.fn().mockResolvedValue(undefined),
    removeSound: vi.fn(),
  })),
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: vi.fn(() => ({
    activeSceneId: null,
    loadScene: vi.fn(),
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
  })),
}))

vi.mock('@/services/storage-service', () => ({
  storageService: {
    setAuthState: vi.fn(),
    decodeSharedMix: vi.fn(() => null),
    getFavorites: vi.fn(() => []),
    getSavedMixes: vi.fn(() => []),
    getRecentSessions: vi.fn(() => []),
    getListeningHistory: vi.fn(() => []),
    getSessionState: vi.fn(() => null),
    clearSessionState: vi.fn(),
  },
  StorageQuotaError: class StorageQuotaError extends Error {},
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map(),
}))

vi.mock('@/components/audio/AmbientBrowser', () => ({
  AmbientBrowser: () => <div data-testid="ambient-browser">AmbientBrowser</div>,
}))

vi.mock('@/components/audio/SleepBrowse', () => ({
  SleepBrowse: () => <div data-testid="sleep-browse">SleepBrowse</div>,
}))

vi.mock('@/components/music/WorshipPlaylistsTab', () => ({
  WorshipPlaylistsTab: () => <div data-testid="worship-playlists">WorshipPlaylists</div>,
}))

vi.mock('@/components/music/SharedMixHero', () => ({
  SharedMixHero: () => null,
}))

vi.mock('@/components/audio/RoutineInterruptDialog', () => ({
  RoutineInterruptDialog: () => null,
}))

beforeEach(() => {
  localStorage.clear()
})

function seedAuth() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
}

describe('MusicPage getting-started flags', () => {
  it('sets ambient_visited when ambient tab active and authenticated', async () => {
    seedAuth()
    const { MusicPage } = await import('../MusicPage')
    render(
      <MemoryRouter initialEntries={['/music?tab=ambient']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <MusicPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    const data = getGettingStartedData()
    expect(data.ambient_visited).toBe(true)
  })

  it('does NOT set flag when logged out', async () => {
    const { MusicPage } = await import('../MusicPage')
    render(
      <MemoryRouter initialEntries={['/music?tab=ambient']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <MusicPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    const data = getGettingStartedData()
    expect(data.ambient_visited).toBe(false)
  })

  it('does NOT set flag when playlists tab active', async () => {
    seedAuth()
    const { MusicPage } = await import('../MusicPage')
    render(
      <MemoryRouter initialEntries={['/music?tab=playlists']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <MusicPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    const data = getGettingStartedData()
    expect(data.ambient_visited).toBe(false)
  })

  it('does NOT set flag when checklist already complete', async () => {
    seedAuth()
    localStorage.setItem('wr_getting_started_complete', 'true')
    const { MusicPage } = await import('../MusicPage')
    render(
      <MemoryRouter initialEntries={['/music?tab=ambient']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <MusicPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    // wr_getting_started should not exist since we didn't create it
    expect(localStorage.getItem('wr_getting_started')).toBeNull()
  })
})

describe('PrayerWall getting-started flags', () => {
  it('sets prayer_wall_visited when authenticated', async () => {
    seedAuth()
    const { PrayerWall } = await import('../PrayerWall')
    render(
      <MemoryRouter initialEntries={['/prayer-wall']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <PrayerWall />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    const data = getGettingStartedData()
    expect(data.prayer_wall_visited).toBe(true)
  })

  it('does NOT set flag when logged out', async () => {
    const { PrayerWall } = await import('../PrayerWall')
    render(
      <MemoryRouter initialEntries={['/prayer-wall']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <PrayerWall />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    const data = getGettingStartedData()
    expect(data.prayer_wall_visited).toBe(false)
  })

  it('does NOT set flag when checklist already complete', async () => {
    seedAuth()
    localStorage.setItem('wr_getting_started_complete', 'true')
    const { PrayerWall } = await import('../PrayerWall')
    render(
      <MemoryRouter initialEntries={['/prayer-wall']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <AuthModalProvider>
              <PrayerWall />
            </AuthModalProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(localStorage.getItem('wr_getting_started')).toBeNull()
  })
})
