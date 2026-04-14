import { render, screen, within, act, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { JournalTabContent } from '../JournalTabContent'
import { _resetCacheForTesting } from '@/lib/bible/journalStore'

// Mock AudioProvider (needed by AmbientSoundPill embedded in JournalTabContent)
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({
    activeSounds: [],
    isPlaying: false,
    currentSceneName: null,
    currentSceneId: null,
    pillVisible: false,
    drawerOpen: false,
    foregroundContent: null,
    sleepTimer: null,
    activeRoutine: null,
    masterVolume: 0.8,
    foregroundBackgroundBalance: 0.5,
    foregroundEndedCounter: 0,
  }),
  useAudioDispatch: () => vi.fn(),
}))

// Mock useScenePlayer (needed by AmbientSoundPill)
vi.mock('@/hooks/useScenePlayer', () => ({
  useScenePlayer: () => ({
    activeSceneId: null,
    loadScene: vi.fn(),
    isLoading: false,
    undoAvailable: false,
    undoSceneSwitch: vi.fn(),
    pendingRoutineInterrupt: null,
    confirmRoutineInterrupt: vi.fn(),
    cancelRoutineInterrupt: vi.fn(),
  }),
}))

// Mock useFaithPoints
vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  _resetCacheForTesting()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
})

afterEach(() => {
  vi.useRealTimers()
})

function renderJournalTab() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <JournalTabContent />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Fast entry save using fireEvent (no userEvent delays) */
function saveEntry(content: string) {
  fireEvent.change(screen.getByLabelText('Journal entry'), { target: { value: content } })
  fireEvent.click(screen.getByRole('button', { name: /save entry/i }))
}

/** Click a mode toggle button in the journal mode group (Guided / Free Write) */
function clickModeToggle(name: RegExp) {
  const modeGroup = screen.getByRole('group', { name: /journal mode/i })
  fireEvent.click(within(modeGroup).getByRole('button', { name, pressed: false }))
}

describe('JournalSearchFilter', () => {
  describe('filter bar visibility', () => {
    it('filter bar hidden with 0 entries', () => {
      renderJournalTab()
      expect(screen.queryByLabelText('Search your entries')).not.toBeInTheDocument()
    })

    it('filter bar hidden with 1 entry', () => {
      renderJournalTab()
      saveEntry('First entry')
      expect(screen.queryByLabelText('Search your entries')).not.toBeInTheDocument()
    })

    it('filter bar visible with 2+ entries', () => {
      renderJournalTab()
      saveEntry('First entry')
      saveEntry('Second entry')
      expect(screen.getByLabelText('Search your entries')).toBeInTheDocument()
    })

    it('filter bar not visible for logged-out users', () => {
      localStorage.removeItem('wr_auth_simulated')
      renderJournalTab()
      expect(screen.queryByLabelText('Search your entries')).not.toBeInTheDocument()
    })
  })

  describe('search', () => {
    it('search filters by content', () => {
      renderJournalTab()
      saveEntry('I feel grateful today')
      saveEntry('Struggling with patience')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'grateful' } })
      act(() => { vi.advanceTimersByTime(300) })

      const entries = screen.getAllByRole('article')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toHaveTextContent('grateful')
    })

    it('search filters by promptText', () => {
      renderJournalTab()

      // Save first entry in free mode
      clickModeToggle(/free write/i)
      saveEntry('Free write entry content')

      // Switch to guided mode and save second entry (will have promptText)
      clickModeToggle(/^guided$/i)
      saveEntry('Guided entry content')

      // Find the prompt text in the rendered entry
      const promptTexts = screen.getAllByText(/^Prompt:/)
      const promptContent = promptTexts[0].textContent?.replace('Prompt: ', '') ?? ''
      const searchWord = promptContent.split(' ').find((w) => w.length > 3) ?? promptContent.split(' ')[0]

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: searchWord } })
      act(() => { vi.advanceTimersByTime(300) })

      const entries = screen.getAllByRole('article')
      expect(entries.length).toBeGreaterThanOrEqual(1)
    })

    it('search is case-insensitive', () => {
      renderJournalTab()
      saveEntry('Serenity and comfort')
      saveEntry('Something else entirely')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'serenity' } })
      act(() => { vi.advanceTimersByTime(300) })

      const entries = screen.getAllByRole('article')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toHaveTextContent('Serenity and comfort')
    })

    it('search debounce 300ms', () => {
      renderJournalTab()
      saveEntry('Unique searchable content')
      saveEntry('Different content here')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'Unique' } })

      // Before debounce fires, both entries should still be visible
      expect(screen.getAllByRole('article')).toHaveLength(2)

      // After 300ms debounce, filter applies
      act(() => { vi.advanceTimersByTime(300) })
      expect(screen.getAllByRole('article')).toHaveLength(1)
    })

    it('clear search button appears and works', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      const searchInput = screen.getByLabelText('Search your entries')
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()

      fireEvent.change(searchInput, { target: { value: 'one' } })
      act(() => { vi.advanceTimersByTime(300) })

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument()

      fireEvent.click(screen.getByLabelText('Clear search'))
      expect(searchInput).toHaveValue('')
      // After clearing, all entries visible (debouncedSearch also cleared instantly)
      expect(screen.getAllByRole('article')).toHaveLength(2)
    })
  })

  describe('mode filter pills', () => {
    it('mode pills default "All" selected', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      const filterGroup = screen.getByRole('group', { name: /filter by journal mode/i })
      const allPill = within(filterGroup).getByRole('button', { name: 'All' })
      expect(allPill).toHaveAttribute('aria-pressed', 'true')
    })

    it('mode filter "Guided" shows only guided entries', () => {
      renderJournalTab()

      // Save free write entry
      clickModeToggle(/free write/i)
      saveEntry('Free write entry')

      // Switch to guided mode and save
      clickModeToggle(/^guided$/i)
      saveEntry('Guided entry')

      // Click the "Guided" filter pill in the filter bar
      const filterGroup = screen.getByRole('group', { name: /filter by journal mode/i })
      fireEvent.click(within(filterGroup).getByRole('button', { name: 'Guided' }))

      const entries = screen.getAllByRole('article')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toHaveTextContent('Guided entry')
    })

    it('mode filter "Free Write" shows only free entries', () => {
      renderJournalTab()

      // Save guided entry (default)
      saveEntry('Guided entry')

      // Switch to free mode and save
      clickModeToggle(/free write/i)
      saveEntry('Free write entry')

      // Click the "Free Write" filter pill
      const filterGroup = screen.getByRole('group', { name: /filter by journal mode/i })
      fireEvent.click(within(filterGroup).getByRole('button', { name: 'Free Write' }))

      const entries = screen.getAllByRole('article')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toHaveTextContent('Free write entry')
    })
  })

  describe('sort toggle', () => {
    it('sort toggle default "Newest first"', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      expect(screen.getByText('Newest first')).toBeInTheDocument()
    })

    it('sort toggle switches direction', () => {
      renderJournalTab()
      saveEntry('First entry saved')
      saveEntry('Second entry saved')

      // Default: newest first — second entry is first in DOM
      let entries = screen.getAllByRole('article')
      expect(entries[0]).toHaveTextContent('Second entry saved')

      // Click sort toggle
      fireEvent.click(screen.getByText('Newest first'))
      expect(screen.getByText('Oldest first')).toBeInTheDocument()

      entries = screen.getAllByRole('article')
      expect(entries[0]).toHaveTextContent('First entry saved')
    })
  })

  describe('combined filtering', () => {
    it('search + mode filter uses AND logic', () => {
      renderJournalTab()

      // Save free entry with specific content
      clickModeToggle(/free write/i)
      saveEntry('Free gratitude reflection')

      // Save guided entry with same keyword
      clickModeToggle(/^guided$/i)
      saveEntry('Guided gratitude reflection')

      // Filter by "Free Write" mode
      const filterGroup = screen.getByRole('group', { name: /filter by journal mode/i })
      fireEvent.click(within(filterGroup).getByRole('button', { name: 'Free Write' }))

      // Search for "gratitude"
      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'gratitude' } })
      act(() => { vi.advanceTimersByTime(300) })

      // Only free entry with "gratitude" should show
      const entries = screen.getAllByRole('article')
      expect(entries).toHaveLength(1)
      expect(entries[0]).toHaveTextContent('Free gratitude reflection')
    })
  })

  describe('empty filter state', () => {
    it('empty filter state shows message and clear button', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'nonexistent xyz content' } })
      act(() => { vi.advanceTimersByTime(300) })

      expect(screen.getByText('No entries match your search')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    })

    it('clear filters resets all', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'nonexistent' } })
      act(() => { vi.advanceTimersByTime(300) })

      // Click "Clear filters"
      fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))

      expect(screen.getByLabelText('Search your entries')).toHaveValue('')
      expect(screen.getAllByRole('article')).toHaveLength(2)
    })
  })

  describe('accessibility', () => {
    it('search input has aria-label', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      expect(screen.getByLabelText('Search your entries')).toBeInTheDocument()
    })

    it('mode pills have role="group"', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      expect(screen.getByRole('group', { name: /filter by journal mode/i })).toBeInTheDocument()
    })

    it('sort toggle has descriptive aria-label', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      const sortBtn = screen.getByLabelText(/sort order: newest first/i)
      expect(sortBtn).toBeInTheDocument()
    })

    it('empty state has role="status"', () => {
      renderJournalTab()
      saveEntry('Entry one')
      saveEntry('Entry two')

      fireEvent.change(screen.getByLabelText('Search your entries'), { target: { value: 'nonexistent content' } })
      act(() => { vi.advanceTimersByTime(300) })

      expect(screen.getByText('No entries match your search')).toBeInTheDocument()
      expect(screen.getByText('No entries match your search').closest('[role="status"]')).toBeInTheDocument()
    })
  })
})
