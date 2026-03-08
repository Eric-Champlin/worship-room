import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AmbientBrowser } from '../AmbientBrowser'
import { SCENE_PRESETS } from '@/data/scenes'
import { SOUND_CATALOG } from '@/data/sound-catalog'
import type { FilterState } from '@/hooks/useAmbientSearch'
import type { AudioState } from '@/types/audio'

// ── Shared mock state ────────────────────────────────────────────────

const mockOpenAuthModal = vi.fn()
const mockShowToast = vi.fn()
const mockDispatch = vi.fn()
const mockEngine = {
  addSound: vi.fn().mockResolvedValue(undefined),
  removeSound: vi.fn(),
  isBufferCached: vi.fn().mockReturnValue(false),
}

let mockIsLoggedIn = false
let mockActiveSounds: AudioState['activeSounds'] = []

let mockSearchState = {
  searchQuery: '',
  hasActiveSearch: false,
  hasActiveFilters: false,
  filteredScenes: SCENE_PRESETS,
  filteredSounds: SOUND_CATALOG,
  filters: {
    mood: [],
    activity: [],
    intensity: [],
    scriptureTheme: [],
  } as FilterState,
  activeFilterCount: 0,
  isFilterPanelOpen: false,
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoggedIn: mockIsLoggedIn }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

vi.mock('../AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: mockActiveSounds,
    masterVolume: 0.8,
    isPlaying: mockActiveSounds.length > 0,
    pillVisible: mockActiveSounds.length > 0,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
  }),
  useAudioDispatch: () => mockDispatch,
  useAudioEngine: () => mockEngine,
}))

vi.mock('@/hooks/useAmbientSearch', () => ({
  useAmbientSearch: () => ({
    searchQuery: mockSearchState.searchQuery,
    setSearchQuery: vi.fn(),
    clearSearch: vi.fn(),
    filters: mockSearchState.filters,
    toggleFilter: vi.fn(),
    clearFilters: vi.fn(),
    activeFilterCount: mockSearchState.activeFilterCount,
    isFilterPanelOpen: mockSearchState.isFilterPanelOpen,
    setFilterPanelOpen: vi.fn(),
    filteredScenes: mockSearchState.filteredScenes,
    filteredSounds: mockSearchState.filteredSounds,
    hasActiveSearch: mockSearchState.hasActiveSearch,
    hasActiveFilters: mockSearchState.hasActiveFilters,
  }),
}))

// ── Tests ────────────────────────────────────────────────────────────

describe('AmbientBrowser Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoggedIn = false
    mockActiveSounds = []
    mockSearchState = {
      searchQuery: '',
      hasActiveSearch: false,
      hasActiveFilters: false,
      filteredScenes: SCENE_PRESETS,
      filteredSounds: SOUND_CATALOG,
      filters: { mood: [], activity: [], intensity: [], scriptureTheme: [] },
      activeFilterCount: 0,
      isFilterPanelOpen: false,
    }
  })

  it('shows auth modal when logged-out user clicks a scene', () => {
    mockIsLoggedIn = false
    render(<AmbientBrowser />)

    const gardenScene = SCENE_PRESETS[0]
    const sceneButton = screen.getAllByRole('button', {
      name: new RegExp(`Play ${gardenScene.name}`),
    })[0]
    fireEvent.click(sceneButton)

    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to play ambient scenes')
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('loads scene sounds at preset volumes when logged in', async () => {
    vi.useFakeTimers()
    mockIsLoggedIn = true
    render(<AmbientBrowser />)

    const gardenScene = SCENE_PRESETS[0]
    const sceneButton = screen.getAllByRole('button', {
      name: new RegExp(`Play ${gardenScene.name}`),
    })[0]

    act(() => {
      fireEvent.click(sceneButton)
    })

    // Advance past staggered loading
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // Verify SET_SCENE_NAME was dispatched
    const sceneNameCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'SET_SCENE_NAME',
    )
    expect(sceneNameCalls.length).toBe(1)
    expect(sceneNameCalls[0][0].payload.sceneName).toBe('Garden of Gethsemane')

    // Verify ADD_SOUND calls use preset volumes (not 0.6)
    const addSoundCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'ADD_SOUND',
    )
    expect(addSoundCalls.length).toBe(gardenScene.sounds.length)

    for (let i = 0; i < gardenScene.sounds.length; i++) {
      expect(addSoundCalls[i][0].payload.volume).toBe(gardenScene.sounds[i].volume)
      expect(addSoundCalls[i][0].payload.soundId).toBe(gardenScene.sounds[i].soundId)
    }

    vi.useRealTimers()
  })

  it('scene name is set after loading', async () => {
    vi.useFakeTimers()
    mockIsLoggedIn = true
    render(<AmbientBrowser />)

    const scene = SCENE_PRESETS[1] // Still Waters
    const sceneButton = screen.getAllByRole('button', {
      name: new RegExp(`Play ${scene.name}`),
    })[0]

    act(() => {
      fireEvent.click(sceneButton)
    })

    const sceneNameCalls = mockDispatch.mock.calls.filter(
      (call) => call[0].type === 'SET_SCENE_NAME',
    )
    expect(sceneNameCalls[0][0].payload.sceneName).toBe('Still Waters')

    vi.useRealTimers()
  })

  it('search filters content correctly', () => {
    mockSearchState = {
      ...mockSearchState,
      searchQuery: 'rain',
      hasActiveSearch: true,
      filteredScenes: SCENE_PRESETS.filter(
        (s) => s.name.toLowerCase().includes('rain') || s.description.toLowerCase().includes('rain'),
      ),
      filteredSounds: SOUND_CATALOG.filter((s) =>
        s.name.toLowerCase().includes('rain'),
      ),
    }

    render(<AmbientBrowser />)

    expect(screen.queryByLabelText('Featured scenes')).not.toBeInTheDocument()
    expect(screen.getByText('Sounds')).toBeInTheDocument()
  })

  it('filter chips reduce visible scenes', () => {
    const sleepScenes = SCENE_PRESETS.filter((s) =>
      s.tags.activity.includes('sleep'),
    )
    mockSearchState = {
      ...mockSearchState,
      hasActiveFilters: true,
      activeFilterCount: 1,
      filters: { mood: [], activity: ['sleep'], intensity: [], scriptureTheme: [] },
      filteredScenes: sleepScenes,
      filteredSounds: SOUND_CATALOG.filter((s) =>
        s.tags.activity.includes('sleep'),
      ),
    }

    render(<AmbientBrowser />)

    const allScenesSection = screen.getByLabelText('All scenes')
    const sceneButtons = allScenesSection.querySelectorAll('button')
    expect(sceneButtons.length).toBe(sleepScenes.length)
    expect(sleepScenes.length).toBeLessThan(8)
  })

  it('no results message when search matches nothing', () => {
    mockSearchState = {
      ...mockSearchState,
      searchQuery: 'xyznonexistent',
      hasActiveSearch: true,
      filteredScenes: [],
      filteredSounds: [],
    }

    render(<AmbientBrowser />)
    expect(screen.getByText(/No sounds or scenes match/)).toBeInTheDocument()
  })

  it('"Search all music" link is visible in search results', () => {
    mockSearchState = {
      ...mockSearchState,
      searchQuery: 'rain',
      hasActiveSearch: true,
      filteredScenes: [],
      filteredSounds: SOUND_CATALOG.filter((s) =>
        s.name.toLowerCase().includes('rain'),
      ),
    }

    render(<AmbientBrowser />)
    expect(screen.getByText(/Search all music/)).toBeInTheDocument()
  })

  it('scene grid has correct responsive column classes', () => {
    render(<AmbientBrowser />)

    const grid = screen.getByLabelText('All scenes').querySelector('.grid')
    expect(grid?.className).toContain('grid-cols-2')
    expect(grid?.className).toContain('sm:grid-cols-3')
    expect(grid?.className).toContain('lg:grid-cols-4')
  })
})
