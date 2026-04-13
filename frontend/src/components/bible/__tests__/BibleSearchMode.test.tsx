import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BibleSearchMode } from '../BibleSearchMode'

const mockSetQuery = vi.fn()
const mockLoadMore = vi.fn()

let mockHookReturn = {
  query: '',
  setQuery: mockSetQuery,
  results: [] as Array<{
    bookName: string; bookSlug: string; chapter: number;
    verseNumber: number; verseText: string; score: number; matchedTokens: string[]
  }>,
  isSearching: false,
  isLoadingIndex: false,
  hasMore: false,
  totalResults: 0,
  loadMore: mockLoadMore,
  error: null as string | null,
}

vi.mock('@/hooks/useBibleSearch', () => ({
  useBibleSearch: () => mockHookReturn,
}))

vi.mock('@/lib/search/tokenizer', () => ({
  stem: (w: string) => w,
}))

function renderSearch(props: { query?: string; onQueryChange?: (q: string) => void } = {}) {
  return render(
    <MemoryRouter>
      <BibleSearchMode query={props.query ?? ''} onQueryChange={props.onQueryChange ?? vi.fn()} />
    </MemoryRouter>,
  )
}

describe('BibleSearchMode — accessibility', () => {
  beforeEach(() => {
    mockHookReturn = {
      query: '', setQuery: mockSetQuery, results: [],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore, error: null,
    }
  })

  it('search input has aria-describedby linking to status', () => {
    renderSearch()
    const input = screen.getByLabelText('Search the Bible')
    expect(input).toHaveAttribute('aria-describedby', 'bible-search-status')
  })

  it('status element has matching id and aria-live', () => {
    const { container } = renderSearch()
    const statusEl = container.querySelector('#bible-search-status')
    expect(statusEl).toBeInTheDocument()
    expect(statusEl).toHaveAttribute('aria-live', 'polite')
  })
})

describe('BibleSearchMode — empty query state', () => {
  beforeEach(() => {
    mockHookReturn = {
      query: '', setQuery: mockSetQuery, results: [],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore, error: null,
    }
  })

  it('renders example search chips when query is empty', () => {
    renderSearch()
    const chips = ['anxiety', 'rest', 'forgiveness', 'courage', 'hope', 'fear']
    for (const chip of chips) {
      expect(screen.getByRole('button', { name: chip })).toBeInTheDocument()
    }
  })

  it('renders 6 example chips', () => {
    renderSearch()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('clicking a chip calls setQuery', async () => {
    const user = userEvent.setup()
    renderSearch()
    await user.click(screen.getByRole('button', { name: 'hope' }))
    expect(mockSetQuery).toHaveBeenCalledWith('hope')
  })

  it('chips are keyboard accessible (button elements)', () => {
    renderSearch()
    const chip = screen.getByRole('button', { name: 'courage' })
    expect(chip.tagName).toBe('BUTTON')
    expect(chip).toHaveAttribute('type', 'button')
  })

  it('renders prompt text', () => {
    renderSearch()
    expect(screen.getByText('Search the Bible for any word, phrase, or theme')).toBeInTheDocument()
  })
})

describe('BibleSearchMode — loading state', () => {
  it('renders loading skeleton during index load', () => {
    mockHookReturn = {
      query: 'love', setQuery: mockSetQuery, results: [],
      isSearching: true, isLoadingIndex: true,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore, error: null,
    }
    renderSearch()
    expect(screen.getByText('Loading search results')).toBeInTheDocument()
  })
})

describe('BibleSearchMode — no results', () => {
  it('renders no-results message when search returns empty', () => {
    mockHookReturn = {
      query: 'xyznotfound', setQuery: mockSetQuery, results: [],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore, error: null,
    }
    renderSearch()
    expect(screen.getByText(/No verses found for/)).toBeInTheDocument()
  })
})

describe('BibleSearchMode — results', () => {
  const sampleResults = [
    {
      bookName: 'John', bookSlug: 'john', chapter: 3, verseNumber: 16,
      verseText: 'For God so loved the world, that he gave his only born Son',
      score: 3, matchedTokens: ['god', 'love', 'world'],
    },
    {
      bookName: 'Romans', bookSlug: 'romans', chapter: 8, verseNumber: 28,
      verseText: 'We know that all things work together for good',
      score: 1, matchedTokens: ['good'],
    },
  ]

  beforeEach(() => {
    mockHookReturn = {
      query: 'love', setQuery: mockSetQuery, results: sampleResults,
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 2, loadMore: mockLoadMore, error: null,
    }
  })

  it('renders result count', () => {
    renderSearch()
    expect(screen.getByText('2 verses found')).toBeInTheDocument()
  })

  it('renders result items with reference and text', () => {
    renderSearch()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.getByText('Romans 8:28')).toBeInTheDocument()
  })

  it('result links to correct deep link URL', () => {
    renderSearch()
    const link = screen.getByText('John 3:16').closest('a')
    expect(link).toHaveAttribute('href', '/bible/john/3?verse=16')
  })

  it('highlight marks matched tokens', () => {
    renderSearch()
    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
  })
})

describe('BibleSearchMode — load more', () => {
  it('renders "Show more results" when hasMore is true', () => {
    mockHookReturn = {
      query: 'peace', setQuery: mockSetQuery,
      results: [{ bookName: 'Psalms', bookSlug: 'psalms', chapter: 1, verseNumber: 1, verseText: 'text', score: 1, matchedTokens: ['peace'] }],
      isSearching: false, isLoadingIndex: false,
      hasMore: true, totalResults: 120, loadMore: mockLoadMore, error: null,
    }
    renderSearch()
    expect(screen.getByRole('button', { name: 'Show more results' })).toBeInTheDocument()
  })

  it('hides "Show more" when no more results', () => {
    mockHookReturn = {
      query: 'love', setQuery: mockSetQuery,
      results: [{ bookName: 'John', bookSlug: 'john', chapter: 3, verseNumber: 16, verseText: 'text', score: 1, matchedTokens: ['love'] }],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 1, loadMore: mockLoadMore, error: null,
    }
    renderSearch()
    expect(screen.queryByRole('button', { name: 'Show more results' })).not.toBeInTheDocument()
  })

  it('clicking "Show more" calls loadMore', async () => {
    const user = userEvent.setup()
    mockHookReturn = {
      query: 'peace', setQuery: mockSetQuery,
      results: [{ bookName: 'Psalms', bookSlug: 'psalms', chapter: 1, verseNumber: 1, verseText: 'text', score: 1, matchedTokens: ['peace'] }],
      isSearching: false, isLoadingIndex: false,
      hasMore: true, totalResults: 120, loadMore: mockLoadMore, error: null,
    }
    renderSearch()
    await user.click(screen.getByRole('button', { name: 'Show more results' }))
    expect(mockLoadMore).toHaveBeenCalled()
  })
})

describe('BibleSearchMode — error state', () => {
  it('renders error message when search fails', () => {
    mockHookReturn = {
      query: 'love', setQuery: mockSetQuery, results: [],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore,
      error: 'Unable to load search. Please try again.',
    }
    renderSearch()
    expect(screen.getByText('Unable to load search. Please try again.')).toBeInTheDocument()
  })

  it('does not render no-results message when error is present', () => {
    mockHookReturn = {
      query: 'love', setQuery: mockSetQuery, results: [],
      isSearching: false, isLoadingIndex: false,
      hasMore: false, totalResults: 0, loadMore: mockLoadMore,
      error: 'Unable to load search. Please try again.',
    }
    renderSearch()
    expect(screen.queryByText(/No verses found/)).not.toBeInTheDocument()
  })
})
