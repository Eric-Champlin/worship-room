import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AmbientBrowser } from '../AmbientBrowser'
import { SCENE_PRESETS, FEATURED_SCENE_IDS } from '@/data/scenes'
import { SOUND_CATALOG } from '@/data/sound-catalog'
import type { FilterState } from '@/hooks/useAmbientSearch'

// ── Mocks ────────────────────────────────────────────────────────────

const mockSetSearchQuery = vi.fn()
const mockClearSearch = vi.fn()
const mockToggleFilter = vi.fn()
const mockClearFilters = vi.fn()
const mockSetFilterPanelOpen = vi.fn()
const mockLoadScene = vi.fn()
const mockUndoSceneSwitch = vi.fn()
const mockToggleSound = vi.fn()

const EMPTY_FILTERS: FilterState = {
  mood: [],
  activity: [],
  intensity: [],
  scriptureTheme: [],
}

let mockSearchReturn = {
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  clearSearch: mockClearSearch,
  filters: EMPTY_FILTERS,
  toggleFilter: mockToggleFilter,
  clearFilters: mockClearFilters,
  activeFilterCount: 0,
  isFilterPanelOpen: false,
  setFilterPanelOpen: mockSetFilterPanelOpen,
  filteredScenes: SCENE_PRESETS,
  filteredSounds: SOUND_CATALOG,
  hasActiveSearch: false,
  hasActiveFilters: false,
}

vi.mock('@/hooks/useAmbientSearch', () => ({
  useAmbientSearch: () => mockSearchReturn,
}))

vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: mockLoadScene,
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: mockUndoSceneSwitch,
  }),
}))

vi.mock('@/hooks/useSoundToggle', () => ({
  useSoundToggle: () => ({
    loadingSoundIds: new Set<string>(),
    errorSoundIds: new Set<string>(),
    toggleSound: mockToggleSound,
  }),
}))

vi.mock('../AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    masterVolume: 0.8,
    isPlaying: false,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    foregroundBackgroundBalance: 0.5,
    sleepTimer: null,
    activeRoutine: null,
    currentSceneName: null,
    currentSceneId: null,
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false }),
}))

vi.mock('@/hooks/useSavedMixes', () => ({
  useSavedMixes: () => ({
    mixes: [],
    saveMix: vi.fn(),
    updateName: vi.fn(),
    deleteMix: vi.fn(),
    duplicateMix: vi.fn(),
  }),
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

// ── Tests ────────────────────────────────────────────────────────────

describe('AmbientBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchReturn = {
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      clearSearch: mockClearSearch,
      filters: EMPTY_FILTERS,
      toggleFilter: mockToggleFilter,
      clearFilters: mockClearFilters,
      activeFilterCount: 0,
      isFilterPanelOpen: false,
      setFilterPanelOpen: mockSetFilterPanelOpen,
      filteredScenes: SCENE_PRESETS,
      filteredSounds: SOUND_CATALOG,
      hasActiveSearch: false,
      hasActiveFilters: false,
    }
  })

  it('renders all 3 sections in default view', () => {
    render(<AmbientBrowser />)

    expect(screen.getByLabelText('Featured scenes')).toBeInTheDocument()
    expect(screen.getByLabelText('All scenes')).toBeInTheDocument()
    expect(screen.getByLabelText('Build your own mix')).toBeInTheDocument()
  })

  it('featured section shows first 3 scenes', () => {
    render(<AmbientBrowser />)

    const featuredSection = screen.getByLabelText('Featured scenes')
    for (const id of FEATURED_SCENE_IDS) {
      const scene = SCENE_PRESETS.find((s) => s.id === id)!
      expect(featuredSection.textContent).toContain(scene.name)
    }
  })

  it('scene grid shows all 8 scenes', () => {
    render(<AmbientBrowser />)

    for (const scene of SCENE_PRESETS) {
      // Each scene appears in featured or grid or both
      expect(screen.getAllByText(scene.name).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('search replaces browse with results', () => {
    mockSearchReturn = {
      ...mockSearchReturn,
      searchQuery: 'rain',
      hasActiveSearch: true,
      filteredScenes: SCENE_PRESETS.filter((s) =>
        s.name.toLowerCase().includes('rain') || s.description.toLowerCase().includes('rain'),
      ),
      filteredSounds: SOUND_CATALOG.filter((s) =>
        s.name.toLowerCase().includes('rain'),
      ),
    }

    render(<AmbientBrowser />)

    // Featured and grid sections should not be present
    expect(screen.queryByLabelText('Featured scenes')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('All scenes')).not.toBeInTheDocument()

    // Search results content should be present
    expect(screen.getByText('Sounds')).toBeInTheDocument()
  })

  it('no results message shows for bad search', () => {
    mockSearchReturn = {
      ...mockSearchReturn,
      searchQuery: 'xyznonexistent',
      hasActiveSearch: true,
      filteredScenes: [],
      filteredSounds: [],
    }

    render(<AmbientBrowser />)
    expect(screen.getByText(/No sounds or scenes match/)).toBeInTheDocument()
  })

  it('search results show sound cards when sounds match query', () => {
    const rainSounds = SOUND_CATALOG.filter((s) =>
      s.name.toLowerCase().includes('rain'),
    )
    mockSearchReturn = {
      ...mockSearchReturn,
      searchQuery: 'rain',
      hasActiveSearch: true,
      filteredScenes: [],
      filteredSounds: rainSounds,
    }

    render(<AmbientBrowser />)
    expect(screen.getByText(/Sounds/i)).toBeInTheDocument()
    expect(screen.getByText(rainSounds[0].name)).toBeInTheDocument()
  })

  it('filters reduce visible scenes (All Scenes grid excludes featured)', () => {
    const peacefulScenes = SCENE_PRESETS.filter((s) =>
      s.tags.mood.includes('peaceful'),
    )
    const peacefulNonFeatured = peacefulScenes.filter(
      (s) => !FEATURED_SCENE_IDS.includes(s.id as (typeof FEATURED_SCENE_IDS)[number]),
    )
    mockSearchReturn = {
      ...mockSearchReturn,
      hasActiveFilters: true,
      filteredScenes: peacefulScenes,
    }

    render(<AmbientBrowser />)

    const allScenesSection = screen.getByLabelText('All scenes')
    // Each scene has 2 buttons (play + favorite), so multiply by 2
    const buttons = allScenesSection.querySelectorAll('button')
    expect(buttons.length).toBe(peacefulNonFeatured.length * 2)
    expect(peacefulScenes.length).toBeLessThan(SCENE_PRESETS.length)
  })

  it('All Scenes grid excludes FEATURED_SCENE_IDS (dedupe)', () => {
    render(<AmbientBrowser />)
    const allScenesSection = screen.getByLabelText('All scenes')
    const featuredSection = screen.getByLabelText('Featured scenes')
    // Each featured scene name appears in featured, NOT in the all-scenes grid
    for (const id of FEATURED_SCENE_IDS) {
      const scene = SCENE_PRESETS.find((s) => s.id === id)!
      expect(featuredSection.textContent).toContain(scene.name)
      expect(allScenesSection.textContent ?? '').not.toContain(scene.name)
    }
  })

  it('Featured and All Scenes headings use default SectionHeader variant with text-white', () => {
    render(<AmbientBrowser />)
    const featured = screen.getByRole('heading', { level: 2, name: /featured/i })
    const allScenes = screen.getByRole('heading', { level: 2, name: /all scenes/i })
    for (const heading of [featured, allScenes]) {
      expect(heading.className).toContain('uppercase')
      expect(heading.className).toContain('tracking-wide')
      expect(heading.className).toContain('text-white')
      expect(heading.className).not.toContain('text-white/50')
      expect(heading.className).not.toContain('text-center')
    }
  })

  it('"Build Your Own Mix" renders as gradient-variant heading', () => {
    render(<AmbientBrowser />)
    const byom = screen.getByRole('heading', {
      level: 2,
      name: /build your own mix/i,
    })
    expect(byom.className).toContain('text-center')
    expect(byom.className).toContain('text-3xl')
    expect(byom.className).toContain('sm:text-4xl')
    expect(byom.className).toContain('lg:text-5xl')
    expect(byom.style.backgroundImage).not.toBe('')
    expect(byom.className).not.toContain('uppercase')
  })

  it('scene grid has responsive classes', () => {
    render(<AmbientBrowser />)

    const grid = screen.getByLabelText('All scenes').querySelector('.grid')
    expect(grid?.className).toContain('grid-cols-2')
    expect(grid?.className).toContain('sm:grid-cols-3')
    expect(grid?.className).toContain('lg:grid-cols-4')
  })
})
