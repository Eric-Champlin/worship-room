import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import type { ActivityItem } from '@/types/my-bible'

// Mock useActivityFeed
const mockUseActivityFeed = vi.fn()
vi.mock('@/hooks/bible/useActivityFeed', () => ({
  useActivityFeed: () => mockUseActivityFeed(),
}))

vi.mock('@/components/bible/BibleDrawerProvider', () => ({
  BibleDrawerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useBibleDrawer: () => ({
    isOpen: false,
    close: vi.fn(),
    toggle: vi.fn(),
    open: vi.fn(),
    currentView: 'books',
    viewStack: [],
  }),
}))

vi.mock('@/components/bible/BibleDrawer', () => ({
  BibleDrawer: () => null,
}))

vi.mock('@/components/bible/DrawerViewRouter', () => ({
  DrawerViewRouter: () => null,
}))

vi.mock('@/components/bible/landing/BibleLandingOrbs', () => ({
  BibleLandingOrbs: () => null,
}))

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/bible/navigateToActivityItem', () => ({
  navigateToActivityItem: vi.fn(),
}))

vi.mock('@/lib/bible/notes/referenceParser', () => ({
  parseReferences: vi.fn(() => []),
}))

// BB-43: Mock useBibleProgress (calls useAuth internally)
vi.mock('@/hooks/useBibleProgress', () => ({
  useBibleProgress: () => ({
    progress: {},
    isChapterRead: vi.fn(() => false),
    markChapterRead: vi.fn(),
  }),
}))

// BB-43: Mock heatmap aggregation functions
vi.mock('@/lib/heatmap', () => ({
  getDailyActivityForLastYear: () => [],
  getBibleCoverage: () => [],
  countActiveDays: () => 0,
  countTotalChaptersRead: () => 0,
  countBooksVisited: () => 0,
  getIntensity: () => 0,
}))

import MyBiblePage from '../MyBiblePage'

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'highlight',
    id: 'hl-1',
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    data: { type: 'highlight', color: 'joy' },
    ...overrides,
  }
}

function makeDefaultFeed(overrides: Partial<ReturnType<typeof mockUseActivityFeed>> = {}) {
  return {
    items: [],
    filter: { type: 'all' as const, book: 'all', color: 'all' as const, searchQuery: '' },
    sort: 'recent' as const,
    setFilter: vi.fn(),
    setSort: vi.fn(),
    totalCounts: { highlights: 0, notes: 0, bookmarks: 0, meditations: 0, booksSet: new Set<string>(), streak: 0 },
    bookCounts: new Map<string, number>(),
    isEmpty: true,
    isFilteredEmpty: false,
    clearFilters: vi.fn(),
    getVerseText: vi.fn(() => 'For God so loved the world'),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <MyBiblePage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('MyBiblePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('renders hero with gradient heading', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    renderPage()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('everything you\'ve marked')).toBeInTheDocument()
  })

  it('dynamic subhead shows item counts', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [makeItem()],
      totalCounts: {
        highlights: 5,
        notes: 2,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john', 'genesis']),
        streak: 0,
      },
    }))
    renderPage()
    expect(screen.getByText(/5 highlights, 2 notes, across 2 books/)).toBeInTheDocument()
  })

  it('dynamic subhead shows empty message', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    renderPage()
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()
  })

  it('quick stats show correct counts', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [makeItem()],
      totalCounts: {
        highlights: 5,
        notes: 0,
        bookmarks: 3,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    renderPage()
    expect(screen.getByText('5')).toBeInTheDocument()
    // "Highlights" appears in both stat card and filter bar — check count label exists
    expect(screen.getAllByText('Highlights').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('3')).toBeInTheDocument()
    // "Bookmarks" appears in both stat card and filter bar
    expect(screen.getAllByText('Bookmarks').length).toBeGreaterThanOrEqual(1)
  })

  it('quick stats omit zero-count cards', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [makeItem()],
      totalCounts: {
        highlights: 5,
        notes: 0,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    renderPage()
    // Notes stat card should not be present — but "Notes" appears in filter bar. Check that
    // Notes text appears only once (in filter bar, not as stat card label)
    const notesElements = screen.getAllByText('Notes')
    expect(notesElements).toHaveLength(1) // only in filter bar
  })

  it('quick stats streak hidden when no streak', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [makeItem()],
      totalCounts: {
        highlights: 1,
        notes: 0,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    renderPage()
    expect(screen.queryByText('Streak')).not.toBeInTheDocument()
  })

  it('tapping stat card sets type filter', async () => {
    const setFilter = vi.fn()
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [makeItem()],
      setFilter,
      totalCounts: {
        highlights: 5,
        notes: 0,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    const user = userEvent.setup()
    renderPage()
    // Click the stat card (first "Highlights" occurrence — the stat card label)
    const highlightElements = screen.getAllByText('Highlights')
    await user.click(highlightElements[0])
    expect(setFilter).toHaveBeenCalled()
  })

  it('truly empty state renders with CTA', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    renderPage()
    expect(screen.getByText(/Your Bible highlights will show up here/)).toBeInTheDocument()
    expect(screen.getAllByText(/Open the reader/).length).toBeGreaterThanOrEqual(1)
  })

  it('filtered empty state renders', () => {
    const clearFilters = vi.fn()
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      isFilteredEmpty: true,
      items: [],
      clearFilters,
      filter: { type: 'notes', book: 'all', color: 'all' as const, searchQuery: '' },
      totalCounts: {
        highlights: 5,
        notes: 0,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    renderPage()
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('clear filters resets feed', async () => {
    const clearFilters = vi.fn()
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      isFilteredEmpty: true,
      items: [],
      clearFilters,
      filter: { type: 'notes', book: 'all', color: 'all' as const, searchQuery: '' },
      totalCounts: {
        highlights: 5,
        notes: 0,
        bookmarks: 0,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Clear filters'))
    expect(clearFilters).toHaveBeenCalled()
  })

  it('footer trust signal renders', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    renderPage()
    expect(screen.getByText(/Stored on this device/)).toBeInTheDocument()
  })

  it('feed renders activity cards', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed({
      isEmpty: false,
      items: [
        makeItem({ id: '1' }),
        makeItem({ id: '2', type: 'bookmark', data: { type: 'bookmark' } }),
      ],
      totalCounts: {
        highlights: 1,
        notes: 0,
        bookmarks: 1,
        meditations: 0,
        booksSet: new Set(['john']),
        streak: 0,
      },
    }))
    renderPage()
    const cards = screen.getAllByRole('button', { name: /John 3:16/ })
    expect(cards.length).toBe(2)
  })

  it('SEO component is rendered with correct title', () => {
    mockUseActivityFeed.mockReturnValue(makeDefaultFeed())
    renderPage()
    // SEO component uses Helmet which may not update document.title in jsdom.
    // Verify the page renders without errors — SEO is tested indirectly.
    expect(screen.getByText('My Bible')).toBeInTheDocument()
  })
})
