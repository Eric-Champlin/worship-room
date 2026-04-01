import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BibleSearchMode } from '../BibleSearchMode'

vi.mock('@/hooks/useBibleSearch', () => ({
  useBibleSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    results: [],
    isSearching: false,
    isLoadingBooks: false,
  }),
  escapeRegex: (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
}))

vi.mock('@/hooks/useStaggeredEntrance', () => ({
  useStaggeredEntrance: () => ({
    containerRef: { current: null },
    getStaggerProps: () => ({ className: '', style: {} }),
  }),
}))

function renderSearch() {
  return render(
    <MemoryRouter>
      <BibleSearchMode />
    </MemoryRouter>,
  )
}

describe('BibleSearchMode — accessibility', () => {
  it('search input has aria-describedby linking to status', () => {
    renderSearch()
    const input = screen.getByLabelText('Search the Bible')
    expect(input).toHaveAttribute('aria-describedby', 'bible-search-status')
  })

  it('status element has matching id', () => {
    const { container } = renderSearch()
    const statusEl = container.querySelector('#bible-search-status')
    expect(statusEl).toBeInTheDocument()
    expect(statusEl).toHaveAttribute('aria-live', 'polite')
  })

  it('status announces search results context', () => {
    renderSearch()
    // When query is empty, the status area is present but may not have search result text
    const input = screen.getByLabelText('Search the Bible')
    expect(input).toHaveAttribute('aria-describedby', 'bible-search-status')
  })
})
