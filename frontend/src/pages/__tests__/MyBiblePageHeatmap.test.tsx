import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock stores and hooks before importing the component
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test User' }, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/bible/useStreakStore', () => ({
  useStreakStore: () => ({
    streak: {
      currentStreak: 3,
      longestStreak: 10,
      lastReadDate: '2026-04-13',
      streakStartDate: '2026-04-11',
      graceDaysAvailable: 1,
      graceDaysUsedThisWeek: 0,
      lastGraceUsedDate: null,
      weekResetDate: '',
      milestones: [],
      totalDaysRead: 30,
    },
    atRisk: false,
  }),
}))

vi.mock('@/hooks/useBibleProgress', () => ({
  useBibleProgress: () => ({
    progress: { genesis: [1, 2, 3], john: [1, 3] },
    isChapterRead: vi.fn(),
    markChapterRead: vi.fn(),
  }),
}))

vi.mock('@/hooks/bible/useActivityFeed', () => ({
  useActivityFeed: () => ({
    items: [],
    filter: { type: 'all', book: 'all', color: 'all', searchQuery: '' },
    sort: 'newest',
    setFilter: vi.fn(),
    setSort: vi.fn(),
    totalCounts: { highlights: 0, notes: 0, bookmarks: 0, booksSet: new Set(), streak: 3 },
    bookCounts: {},
    isEmpty: true,
    isFilteredEmpty: false,
    clearFilters: vi.fn(),
    getVerseText: vi.fn(),
  }),
}))

vi.mock('@/hooks/url/useMyBibleView', () => ({
  useMyBibleView: () => ({ view: 'all', setView: vi.fn() }),
}))

vi.mock('@/components/bible/BibleDrawerProvider', () => ({
  BibleDrawerProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useBibleDrawer: () => ({ isOpen: false, close: vi.fn(), dispatch: vi.fn() }),
}))

vi.mock('@/components/bible/BibleDrawer', () => ({
  BibleDrawer: () => null,
}))

vi.mock('@/components/bible/DrawerViewRouter', () => ({
  DrawerViewRouter: () => null,
}))

// Mock the heatmap data functions
vi.mock('@/lib/heatmap', async () => {
  const { BIBLE_BOOKS } = await import('@/constants/bible')

  const activity = Array.from({ length: 365 }, (_, i) => {
    const d = new Date('2026-04-13T00:00:00')
    d.setDate(d.getDate() - (364 - i))
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      date: dateStr,
      chapterCount: i === 364 ? 2 : 0, // only today has activity
      chapters: i === 364 ? [{ book: 'genesis', chapter: 1 }, { book: 'genesis', chapter: 2 }] : [],
    }
  })

  return {
    getDailyActivityForLastYear: () => activity,
    countActiveDays: () => 1,
    getBibleCoverage: (progress: Record<string, number[]>) => {
      return BIBLE_BOOKS.map((b) => ({
        name: b.name,
        slug: b.slug,
        testament: b.testament,
        totalChapters: b.chapters,
        readChapters: new Set(progress[b.slug] ?? []),
        highlightedChapters: new Set<number>(),
      }))
    },
    countTotalChaptersRead: () => 5,
    countBooksVisited: () => 2,
    getIntensity: (count: number) => {
      if (count === 0) return 0
      if (count <= 2) return 1
      if (count <= 5) return 2
      if (count <= 9) return 3
      return 4
    },
  }
})

vi.mock('@/lib/bible/streakStore', () => ({
  getStreak: () => ({
    currentStreak: 3,
    longestStreak: 10,
    lastReadDate: '2026-04-13',
    totalDaysRead: 30,
  }),
  subscribe: () => () => {},
}))

vi.mock('@/lib/bible/highlightStore', () => ({
  getAllHighlights: () => [],
  subscribe: () => () => {},
}))

vi.mock('@/lib/bible/bookmarkStore', () => ({
  getAllBookmarks: () => [],
  subscribe: () => () => {},
}))

vi.mock('@/lib/bible/notes/store', () => ({
  getAllNotes: () => [],
  subscribe: () => () => {},
}))

vi.mock('@/components/bible/landing/BibleLandingOrbs', () => ({
  BibleLandingOrbs: () => null,
}))

vi.mock('@/components/homepage/SectionHeading', () => ({
  SectionHeading: ({ topLine, bottomLine }: { topLine: string; bottomLine: string }) => (
    <div>{topLine} {bottomLine}</div>
  ),
}))

vi.mock('@/components/PageHero', () => ({
  ATMOSPHERIC_HERO_BG: {},
}))

vi.mock('@/lib/seo/routeMetadata', () => ({
  MY_BIBLE_METADATA: { title: 'My Bible', description: 'test' },
}))

vi.mock('@/components/SEO', () => ({
  SEO: () => null,
  SITE_URL: 'https://test.com',
}))

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/bible/streak/StreakDetailModal', () => ({
  StreakDetailModal: () => null,
}))

import MyBiblePage from '../MyBiblePage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bible/my']}>
      <MyBiblePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('MyBiblePage — Heatmap & Progress Map integration (BB-43)', () => {
  it('renders ReadingHeatmap on My Bible page', () => {
    renderPage()
    expect(screen.getByLabelText('Reading heatmap')).toBeDefined()
  })

  it('renders BibleProgressMap on My Bible page', () => {
    renderPage()
    expect(screen.getByLabelText('Bible progress map')).toBeDefined()
  })

  it('heatmap appears above progress map', () => {
    renderPage()
    const heatmap = screen.getByLabelText('Reading heatmap')
    const progressMap = screen.getByLabelText('Bible progress map')
    // DOM order: heatmap before progress map
    expect(heatmap.compareDocumentPosition(progressMap) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('progress map appears above activity feed empty state', () => {
    renderPage()
    const progressMap = screen.getByLabelText('Bible progress map')
    const emptyState = screen.getByText('Your Bible highlights will show up here')
    expect(progressMap.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('page renders correctly with no reading data', () => {
    renderPage()
    // Both sections should render (empty states handled inside components)
    expect(screen.getByLabelText('Reading heatmap')).toBeDefined()
    expect(screen.getByLabelText('Bible progress map')).toBeDefined()
  })

  it('existing empty state still renders', () => {
    renderPage()
    expect(screen.getByText('Your Bible highlights will show up here')).toBeDefined()
  })
})
