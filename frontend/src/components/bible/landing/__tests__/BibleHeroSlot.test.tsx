import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BibleHeroSlot } from '../BibleHeroSlot'
import type { LastReadState } from '@/hooks/bible/useLastRead'

// Mock useLastRead to control reader state
const mockUseLastRead = vi.fn<() => LastReadState>()
vi.mock('@/hooks/bible/useLastRead', () => ({
  useLastRead: () => mockUseLastRead(),
}))

// Mock VerseOfTheDay to keep tests focused on composition logic
vi.mock('../VerseOfTheDay', () => ({
  VerseOfTheDay: () => <div data-testid="votd-card">Verse of the Day</div>,
}))

// Mock ResumeReadingCard to keep tests focused on composition logic
vi.mock('../ResumeReadingCard', () => ({
  ResumeReadingCard: (props: { book: string; chapter: number }) => (
    <div data-testid="resume-card">
      Resume: {props.book} {props.chapter}
    </div>
  ),
}))

function renderSlot() {
  return render(
    <MemoryRouter>
      <BibleHeroSlot />
    </MemoryRouter>,
  )
}

const ACTIVE_STATE: LastReadState = {
  book: 'John',
  chapter: 3,
  timestamp: Date.now(),
  isActiveReader: true,
  isLapsedReader: false,
  isFirstTimeReader: false,
  relativeTime: '2 hours ago',
  firstLineOfChapter: 'Now there was a man of the Pharisees...',
  slug: 'john',
  nextChapter: { bookSlug: 'john', bookName: 'John', chapter: 4 },
}

const LAPSED_STATE: LastReadState = {
  book: 'John',
  chapter: 3,
  timestamp: Date.now() - 90_000_000,
  isActiveReader: false,
  isLapsedReader: true,
  isFirstTimeReader: false,
  relativeTime: 'Yesterday',
  firstLineOfChapter: null,
  slug: 'john',
  nextChapter: null,
}

const FIRST_TIME_STATE: LastReadState = {
  book: null,
  chapter: null,
  timestamp: null,
  isActiveReader: false,
  isLapsedReader: false,
  isFirstTimeReader: true,
  relativeTime: '',
  firstLineOfChapter: null,
  slug: null,
  nextChapter: null,
}

describe('BibleHeroSlot', () => {
  it('renders resume card when active reader', () => {
    mockUseLastRead.mockReturnValue(ACTIVE_STATE)
    renderSlot()

    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
    expect(screen.getByText(/Resume: John 3/)).toBeInTheDocument()
  })

  it('renders VOTD below resume card when active', () => {
    mockUseLastRead.mockReturnValue(ACTIVE_STATE)
    const { container } = renderSlot()

    const resume = screen.getByTestId('resume-card')
    const votd = screen.getByTestId('votd-card')

    // Both present
    expect(resume).toBeInTheDocument()
    expect(votd).toBeInTheDocument()

    // Resume appears before VOTD in DOM order
    const parent = container.querySelector('.space-y-6')
    expect(parent).not.toBeNull()
    const children = Array.from(parent!.children)
    const resumeIdx = children.indexOf(resume)
    const votdIdx = children.indexOf(votd)
    expect(resumeIdx).toBeLessThan(votdIdx)
  })

  it('renders VOTD as primary when lapsed reader', () => {
    mockUseLastRead.mockReturnValue(LAPSED_STATE)
    renderSlot()

    expect(screen.getByTestId('votd-card')).toBeInTheDocument()
    expect(screen.queryByTestId('resume-card')).not.toBeInTheDocument()
  })

  it('renders lapsed-reader link when lapsed', () => {
    mockUseLastRead.mockReturnValue(LAPSED_STATE)
    renderSlot()

    expect(screen.getByText(/Last read:/)).toBeInTheDocument()
    expect(screen.getByText('John 3')).toBeInTheDocument()
    expect(screen.getByText(/Yesterday/)).toBeInTheDocument()
  })

  it('lapsed link navigates to correct URL', () => {
    mockUseLastRead.mockReturnValue(LAPSED_STATE)
    renderSlot()

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/bible/john/3')
  })

  it('renders VOTD only for first-time reader', () => {
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    renderSlot()

    expect(screen.getByTestId('votd-card')).toBeInTheDocument()
  })

  it('no resume affordance for first-time reader', () => {
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    renderSlot()

    expect(screen.queryByTestId('resume-card')).not.toBeInTheDocument()
    expect(screen.queryByText(/Last read:/)).not.toBeInTheDocument()
  })

  it('lapsed link has 44px tap target', () => {
    mockUseLastRead.mockReturnValue(LAPSED_STATE)
    renderSlot()

    const link = screen.getByRole('link')
    expect(link.className).toContain('min-h-[44px]')
  })
})
