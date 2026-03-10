import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PersonalizationSection } from '../PersonalizationSection'

// ── Mocks ────────────────────────────────────────────────────────────

let mockIsLoggedIn = false

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

let mockFavorites: { type: 'scene' | 'sleep_session' | 'custom_mix'; targetId: string; createdAt: string }[] = []

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: mockFavorites,
    isFavorite: vi.fn(() => false),
    toggleFavorite: vi.fn(),
    isLoading: false,
  }),
}))

let mockMixes: { id: string; name: string; sounds: { soundId: string; volume: number }[]; createdAt: string; updatedAt: string }[] = []

vi.mock('@/hooks/useSavedMixes', () => ({
  useSavedMixes: () => ({
    mixes: mockMixes,
    saveMix: vi.fn(),
    updateName: vi.fn(),
    deleteMix: vi.fn(),
    duplicateMix: vi.fn(),
  }),
}))

let mockLastSession: { id: string; contentType: string; contentId: string; startedAt: string; durationSeconds: number; completed: boolean } | null = null

vi.mock('@/hooks/useListeningHistory', () => ({
  useListeningHistory: () => ({
    logSession: vi.fn(),
    getLastSession: () => mockLastSession,
    getRecentSessions: () => [],
  }),
}))

vi.mock('@/data/scenes', () => ({
  SCENE_BY_ID: new Map([
    ['morning-mist', { id: 'morning-mist', name: 'Morning Mist', artworkFilename: 'morning-mist.svg' }],
  ]),
}))

vi.mock('@/data/music/scripture-readings', () => ({
  SCRIPTURE_READING_BY_ID: new Map([
    ['psalm-23', { id: 'psalm-23', title: 'The Lord is My Shepherd' }],
  ]),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioDispatch: () => vi.fn(),
  useAudioEngine: () => ({
    addSound: vi.fn().mockResolvedValue(undefined),
    removeSound: vi.fn(),
  }),
}))

vi.mock('@/data/music/bedtime-stories', () => ({
  BEDTIME_STORY_BY_ID: new Map(),
}))

vi.mock('@/constants/audio', () => ({
  AUDIO_BASE_URL: '/audio/',
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['gentle-rain', { id: 'gentle-rain', name: 'Gentle Rain' }],
    ['ocean-waves', { id: 'ocean-waves', name: 'Ocean Waves' }],
  ]),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('PersonalizationSection', () => {
  beforeEach(() => {
    mockIsLoggedIn = false
    mockFavorites = []
    mockMixes = []
    mockLastSession = null
  })

  it('hidden for logged-out users', () => {
    const { container } = render(<PersonalizationSection />)
    expect(container.innerHTML).toBe('')
  })

  it('hidden when logged in but no data', () => {
    mockIsLoggedIn = true
    const { container } = render(<PersonalizationSection />)
    expect(container.innerHTML).toBe('')
  })

  it('renders "Continue Listening" with last session', () => {
    mockIsLoggedIn = true
    mockLastSession = {
      id: '1',
      contentType: 'scene',
      contentId: 'morning-mist',
      startedAt: new Date().toISOString(),
      durationSeconds: 120,
      completed: false,
    }

    render(<PersonalizationSection />)
    expect(screen.getByText('Continue Listening')).toBeInTheDocument()
    expect(screen.getByText('Morning Mist')).toBeInTheDocument()
    expect(screen.getByText('Ambient Scene')).toBeInTheDocument()
  })

  it('renders "Your Favorites" with favorited items', () => {
    mockIsLoggedIn = true
    mockFavorites = [
      { type: 'scene', targetId: 'morning-mist', createdAt: new Date().toISOString() },
    ]

    render(<PersonalizationSection />)
    expect(screen.getByText('Your Favorites')).toBeInTheDocument()
    expect(screen.getByText('Morning Mist')).toBeInTheDocument()
    expect(screen.getByText('Scene')).toBeInTheDocument()
  })

  it('renders "Your Saved Mixes" with saved mixes', () => {
    mockIsLoggedIn = true
    mockMixes = [
      {
        id: 'mix-1',
        name: 'Rainy Night',
        sounds: [
          { soundId: 'gentle-rain', volume: 0.7 },
          { soundId: 'ocean-waves', volume: 0.5 },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    render(<PersonalizationSection />)
    expect(screen.getByText('Your Saved Mixes')).toBeInTheDocument()
    expect(screen.getByText('Rainy Night')).toBeInTheDocument()
    expect(screen.getByText('Gentle Rain, Ocean Waves')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    mockIsLoggedIn = true
    mockLastSession = {
      id: '1',
      contentType: 'scene',
      contentId: 'morning-mist',
      startedAt: new Date().toISOString(),
      durationSeconds: 60,
      completed: false,
    }

    render(<PersonalizationSection />)
    expect(
      screen.getByLabelText('Personalized recommendations'),
    ).toBeInTheDocument()
  })
})
