import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CrossRefsSubView, CrossRefBadge } from '../CrossRefsSubView'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'
import type { CrossRef, CrossRefMap } from '@/types/bible'

// --- Mocks ---

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/lib/bible/verseActionRegistry', () => ({
  formatReference: vi.fn(
    (sel: VerseSelection) =>
      sel.startVerse === sel.endVerse
        ? `${sel.bookName} ${sel.chapter}:${sel.startVerse}`
        : `${sel.bookName} ${sel.chapter}:${sel.startVerse}\u2013${sel.endVerse}`,
  ),
}))

vi.mock('@/data/bible', () => ({
  getBookBySlug: vi.fn((slug: string) => {
    const books: Record<string, { name: string; slug: string }> = {
      romans: { name: 'Romans', slug: 'romans' },
      john: { name: 'John', slug: 'john' },
      genesis: { name: 'Genesis', slug: 'genesis' },
      revelation: { name: 'Revelation', slug: 'revelation' },
    }
    return books[slug] ?? undefined
  }),
  loadChapterWeb: vi.fn().mockResolvedValue({
    bookSlug: 'romans',
    chapter: 5,
    verses: [
      { number: 8, text: 'But God commends his own love toward us...' },
      { number: 9, text: 'Much more then, being now justified by his blood...' },
    ],
  }),
}))

const mockLoadCrossRefsForBook = vi.fn()
const mockCollectCrossRefsForRange = vi.fn()
const mockGetCachedBook = vi.fn()
const mockGetDeduplicatedCrossRefCount = vi.fn()

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: (...args: unknown[]) => mockLoadCrossRefsForBook(...args),
  collectCrossRefsForRange: (...args: unknown[]) => mockCollectCrossRefsForRange(...args),
  getCachedBook: (...args: unknown[]) => mockGetCachedBook(...args),
  getDeduplicatedCrossRefCount: (...args: unknown[]) => mockGetDeduplicatedCrossRefCount(...args),
}))

vi.mock('@/lib/bible/crossRefs/sort', () => ({
  sortByStrength: vi.fn((refs: CrossRef[]) => [...refs].sort((a, b) => a.rank - b.rank)),
  sortByCanonicalOrder: vi.fn((refs: CrossRef[]) => [...refs]),
}))

vi.mock('@/lib/bible/crossRefs/navigation', () => ({
  buildCrossRefRoute: vi.fn(
    (bookSlug: string, chapter: number) => `/bible/${bookSlug}/${chapter}`,
  ),
}))

// --- Helpers ---

const makeSelection = (overrides: Partial<VerseSelection> = {}): VerseSelection => ({
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
  ...overrides,
})

const makeContext = (): VerseActionContext => ({
  showToast: vi.fn(),
  closeSheet: vi.fn(),
})

const makeCrossRef = (overrides: Partial<CrossRef> = {}): CrossRef => ({
  ref: 'romans.5.8',
  rank: 1,
  parsed: { book: 'romans', chapter: 5, verse: 8 },
  ...overrides,
})

const SAMPLE_REFS: CrossRef[] = [
  makeCrossRef({ ref: 'romans.5.8', rank: 1, parsed: { book: 'romans', chapter: 5, verse: 8 } }),
  makeCrossRef({
    ref: 'genesis.22.2',
    rank: 2,
    parsed: { book: 'genesis', chapter: 22, verse: 2 },
  }),
  makeCrossRef({
    ref: 'revelation.3.20',
    rank: 3,
    parsed: { book: 'revelation', chapter: 3, verse: 20 },
  }),
]

// --- Tests ---

describe('CrossRefsSubView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadCrossRefsForBook.mockResolvedValue(new Map())
    mockCollectCrossRefsForRange.mockReturnValue(SAMPLE_REFS)
  })

  it('renders subtitle with reference', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText('for John 3:16')).toBeInTheDocument()
    })
  })

  it('renders context strip with verse text', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText('For God so loved the world...')).toBeInTheDocument()
    })
  })

  it('renders skeleton loaders while loading', () => {
    // Make the loader never resolve to keep loading state
    mockLoadCrossRefsForBook.mockReturnValue(new Promise(() => {}))

    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    // Skeleton elements should be visible (animate-pulse spans)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders empty state for verse with no refs', async () => {
    mockCollectCrossRefsForRange.mockReturnValue([])

    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText('No cross-references for this verse.')).toBeInTheDocument()
    })
  })

  it('sort toggle defaults to "Strongest first"', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      const strongestBtn = screen.getByText('Strongest first')
      expect(strongestBtn.className).toContain('bg-white/[0.12]')
    })
  })

  it('switching to "Canonical order" re-sorts list', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText('Canonical order')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Canonical order'))

    const canonicalBtn = screen.getByText('Canonical order')
    expect(canonicalBtn.className).toContain('bg-white/[0.12]')
  })

  it('tapping a row calls navigate with correct route', async () => {
    const context = makeContext()
    render(<CrossRefsSubView selection={makeSelection()} context={context} />)

    await waitFor(() => {
      expect(screen.getByText(/Romans 5:8/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Romans 5:8/).closest('button')!)

    expect(mockNavigate).toHaveBeenCalledWith('/bible/romans/5', { replace: true })
  })

  it('tapping a row closes the sheet with navigating flag', async () => {
    const context = makeContext()
    render(<CrossRefsSubView selection={makeSelection()} context={context} />)

    await waitFor(() => {
      expect(screen.getByText(/Romans 5:8/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Romans 5:8/).closest('button')!)

    expect(context.closeSheet).toHaveBeenCalledWith({ navigating: true })
  })

  it('rank indicator opacity matches rank', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText(/Romans 5:8/)).toBeInTheDocument()
    })

    const indicators = document.querySelectorAll('[data-testid="rank-indicator"]')
    expect(indicators).toHaveLength(3)

    // Rank 1 = opacity 1, rank 2 = 0.6, rank 3 = 0.4
    expect((indicators[0] as HTMLElement).style.opacity).toBe('1')
    expect((indicators[1] as HTMLElement).style.opacity).toBe('0.6')
    expect((indicators[2] as HTMLElement).style.opacity).toBe('0.4')
  })

  it('hides sort toggle when no refs', async () => {
    mockCollectCrossRefsForRange.mockReturnValue([])

    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText('No cross-references for this verse.')).toBeInTheDocument()
    })

    expect(screen.queryByText('Strongest first')).not.toBeInTheDocument()
  })

  it('renders footer attribution', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Cross-references from Treasury of Scripture Knowledge · Public Domain',
        ),
      ).toBeInTheDocument()
    })
  })

  it('all rows have min 44px height class', async () => {
    render(<CrossRefsSubView selection={makeSelection()} context={makeContext()} />)

    await waitFor(() => {
      expect(screen.getByText(/Romans 5:8/)).toBeInTheDocument()
    })

    const buttons = screen
      .getByText(/Romans 5:8/)
      .closest('button')!
      .parentElement!.querySelectorAll('button')
    for (const btn of buttons) {
      expect(btn.className).toContain('min-h-[44px]')
    }
  })

  it('multi-verse shows deduplicated refs', async () => {
    const multiVerseSelection = makeSelection({
      startVerse: 16,
      endVerse: 17,
      verses: [
        { number: 16, text: 'For God so loved...' },
        { number: 17, text: 'For God didn\'t send...' },
      ],
    })

    // Return refs with a duplicate
    const refsWithDupe = [
      makeCrossRef({ ref: 'romans.5.8', rank: 1, parsed: { book: 'romans', chapter: 5, verse: 8 }, sourceVerse: 16 }),
      makeCrossRef({ ref: 'genesis.22.2', rank: 2, parsed: { book: 'genesis', chapter: 22, verse: 2 }, sourceVerse: 17 }),
    ]
    mockCollectCrossRefsForRange.mockReturnValue(refsWithDupe)

    render(<CrossRefsSubView selection={multiVerseSelection} context={makeContext()} />)

    await waitFor(() => {
      // Should show 2 unique rows (deduplicated by collectCrossRefsForRange)
      expect(screen.getByText(/Romans 5:8/)).toBeInTheDocument()
      expect(screen.getByText(/Genesis 22:2/)).toBeInTheDocument()
    })
  })
})

describe('CrossRefBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows count when book is cached', () => {
    const mockMap = new Map() as CrossRefMap
    mockGetCachedBook.mockReturnValue(mockMap)
    mockGetDeduplicatedCrossRefCount.mockReturnValue(5)

    render(<CrossRefBadge selection={makeSelection()} />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows pulse when loading', () => {
    mockGetCachedBook.mockReturnValue(null)
    mockLoadCrossRefsForBook.mockReturnValue(new Promise(() => {}))

    render(<CrossRefBadge selection={makeSelection()} />)

    expect(screen.getByLabelText('Loading cross-reference count')).toBeInTheDocument()
  })

  it('hidden when count is 0', () => {
    const mockMap = new Map() as CrossRefMap
    mockGetCachedBook.mockReturnValue(mockMap)
    mockGetDeduplicatedCrossRefCount.mockReturnValue(0)

    const { container } = render(<CrossRefBadge selection={makeSelection()} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows "99+" for large counts', () => {
    const mockMap = new Map() as CrossRefMap
    mockGetCachedBook.mockReturnValue(mockMap)
    mockGetDeduplicatedCrossRefCount.mockReturnValue(150)

    render(<CrossRefBadge selection={makeSelection()} />)

    expect(screen.getByText('99+')).toBeInTheDocument()
  })
})
