import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SavedTabContent } from '@/components/audio/SavedTabContent'
import type { SavedMix } from '@/types/storage'

// ── Mocks ────────────────────────────────────────────────────────────

let mockMixes: SavedMix[] = []
const mockUpdateName = vi.fn()
const mockDeleteMix = vi.fn()
const mockDuplicateMix = vi.fn()
const mockSaveMix = vi.fn()
const mockDispatch = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: true }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    isFavorite: () => false,
    toggleFavorite: vi.fn(),
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useSavedMixes', () => ({
  useSavedMixes: () => ({
    mixes: mockMixes,
    saveMix: mockSaveMix,
    updateName: mockUpdateName,
    deleteMix: mockDeleteMix,
    duplicateMix: mockDuplicateMix,
  }),
}))

vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    currentSceneName: null,
    currentSceneId: null,
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: true,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => ({
    addSound: vi.fn().mockResolvedValue(undefined),
    removeSound: vi.fn(),
  }),
}))

vi.mock('@/data/sound-catalog', () => ({
  SOUND_BY_ID: new Map([
    ['gentle-rain', { id: 'gentle-rain', name: 'Gentle Rain', lucideIcon: 'CloudRain' }],
    ['fireplace', { id: 'fireplace', name: 'Fireplace', lucideIcon: 'Flame' }],
  ]),
}))

vi.mock('@/components/audio/sound-icon-map', () => ({
  getSoundIcon: () => () => null,
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('SavedTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMixes = []
  })

  it('shows empty state when no mixes', () => {
    render(<SavedTabContent />)

    expect(screen.getByText('No saved mixes yet')).toBeInTheDocument()
    expect(
      screen.getByText('Create a custom mix and tap Save to keep it'),
    ).toBeInTheDocument()
  })

  it('renders list of saved mixes', () => {
    mockMixes = [
      {
        id: 'mix-1',
        name: 'Evening Calm',
        sounds: [{ soundId: 'gentle-rain', volume: 0.7 }],
        createdAt: '2026-03-09T10:00:00Z',
        updatedAt: '2026-03-09T10:00:00Z',
      },
      {
        id: 'mix-2',
        name: 'Focus Mode',
        sounds: [{ soundId: 'fireplace', volume: 0.5 }],
        createdAt: '2026-03-09T11:00:00Z',
        updatedAt: '2026-03-09T11:00:00Z',
      },
    ]

    render(<SavedTabContent />)

    expect(screen.getByText('Evening Calm')).toBeInTheDocument()
    expect(screen.getByText('Focus Mode')).toBeInTheDocument()
  })

  it('load action dispatches sounds', () => {
    mockMixes = [
      {
        id: 'mix-1',
        name: 'Evening Calm',
        sounds: [{ soundId: 'gentle-rain', volume: 0.7 }],
        createdAt: '2026-03-09T10:00:00Z',
        updatedAt: '2026-03-09T10:00:00Z',
      },
    ]

    render(<SavedTabContent />)

    // The load button is the mix name button
    const loadButton = screen.getByText('Evening Calm')
    loadButton.click()

    // Should dispatch SET_SCENE_NAME with null (custom mix, not a scene)
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_SCENE_NAME',
      payload: { sceneName: null, sceneId: null },
    })
  })
})
