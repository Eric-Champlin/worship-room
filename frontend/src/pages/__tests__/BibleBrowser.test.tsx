import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BibleBrowser } from '../BibleBrowser'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
  }),
}))

vi.mock('@/hooks/useBibleHighlights', () => ({
  useBibleHighlights: () => ({
    getHighlightsForChapter: vi.fn().mockReturnValue([]),
    getHighlightForVerse: vi.fn().mockReturnValue(undefined),
    setHighlight: vi.fn(),
    removeHighlight: vi.fn(),
    getAllHighlights: vi.fn().mockReturnValue([]),
  }),
}))

vi.mock('@/hooks/useBibleNotes', () => ({
  useBibleNotes: () => ({
    getNotesForChapter: vi.fn().mockReturnValue([]),
    getNoteForVerse: vi.fn().mockReturnValue(undefined),
    saveNote: vi.fn().mockReturnValue(true),
    deleteNote: vi.fn(),
    getAllNotes: vi.fn().mockReturnValue([]),
  }),
}))

function renderPage(route = '/bible') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BibleBrowser />
    </MemoryRouter>,
  )
}

describe('BibleBrowser', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  describe('Hero section', () => {
    it('renders "The Bible" heading', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: 'The Bible', level: 1 })).toBeInTheDocument()
    })

    it('content area uses max-w-5xl with lg:px-8', () => {
      const { container } = renderPage()
      const contentDiv = container.querySelector('.max-w-5xl')
      expect(contentDiv).toBeInTheDocument()
      expect(contentDiv?.className).toContain('lg:px-8')
    })

    it('title has padding for Caveat flourish fix', () => {
      renderPage()
      const heading = screen.getByRole('heading', { name: 'The Bible', level: 1 })
      expect(heading.className).toContain('px-1')
      expect(heading.className).toContain('sm:px-2')
    })

    it('renders "The Word of God" subtitle in serif italic', () => {
      renderPage()
      const subtitle = screen.getByText('The Word of God')
      expect(subtitle).toBeInTheDocument()
      expect(subtitle.className).toContain('font-serif')
      expect(subtitle.className).toContain('italic')
    })
  })

  describe('Segmented control', () => {
    it('defaults to Books mode', () => {
      renderPage()
      const booksTab = screen.getByRole('tab', { name: 'Books' })
      expect(booksTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to Search mode on click', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByRole('tab', { name: 'Search' }))
      expect(screen.getByRole('tab', { name: 'Search' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  describe('Books mode', () => {
    it('renders Old Testament and New Testament sections', () => {
      renderPage()
      expect(screen.getByText('Old Testament')).toBeInTheDocument()
      expect(screen.getByText('New Testament')).toBeInTheDocument()
    })

    it('OT section shows 39 books count', () => {
      renderPage()
      expect(screen.getByText('39 books')).toBeInTheDocument()
    })

    it('NT section shows 27 books count', () => {
      renderPage()
      expect(screen.getByText('27 books')).toBeInTheDocument()
    })

    it('OT is expanded by default', () => {
      renderPage()
      // OT expanded: Genesis should be visible
      expect(screen.getByText('Genesis')).toBeInTheDocument()
    })

    it('clicking a book expands its chapter grid', async () => {
      const user = userEvent.setup()
      renderPage()
      const genesisButton = screen.getByText('Genesis').closest('button')!
      await user.click(genesisButton)
      // Chapter 1 link should appear
      expect(screen.getByRole('link', { name: 'Chapter 1' })).toBeInTheDocument()
    })

    it('only one book expanded at a time within a category', async () => {
      const user = userEvent.setup()
      renderPage()

      // Expand Genesis
      await user.click(screen.getByText('Genesis').closest('button')!)
      expect(screen.getByRole('link', { name: 'Chapter 1' })).toBeInTheDocument()

      // Expand Exodus — Genesis should collapse
      await user.click(screen.getByText('Exodus').closest('button')!)
      // Genesis has 50 chapters, Exodus has 40. The grid should now show Exodus chapters.
      // Check that only one chapter grid is visible by looking for the 40 chapters link count
      const links = screen.getAllByRole('link')
      const chapterLinks = links.filter((l) => l.getAttribute('aria-label')?.startsWith('Chapter'))
      expect(chapterLinks).toHaveLength(40) // Exodus has 40 chapters
    })

    it('chapter button navigates to /bible/:slug/:chapter', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByText('Genesis').closest('button')!)
      const ch1Link = screen.getByRole('link', { name: 'Chapter 1' })
      expect(ch1Link).toHaveAttribute('href', '/bible/genesis/1')
    })

    it('?book= query param auto-expands that book', () => {
      renderPage('/bible?book=john')
      // NT should be expanded since John is NT
      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('shows progress for logged-in users with read chapters', () => {
      mockAuth.isAuthenticated = true
      localStorage.setItem(
        'wr_bible_progress',
        JSON.stringify({ genesis: [1, 2, 3] }),
      )
      renderPage()
      expect(screen.getByText('3/50 read')).toBeInTheDocument()
    })

    it('does not show progress for logged-out users', () => {
      localStorage.setItem(
        'wr_bible_progress',
        JSON.stringify({ genesis: [1, 2, 3] }),
      )
      renderPage()
      expect(screen.queryByText(/\d+\/\d+ read/)).not.toBeInTheDocument()
    })

    it('chapter buttons have 44px minimum size', async () => {
      const user = userEvent.setup()
      renderPage()
      await user.click(screen.getByText('Genesis').closest('button')!)
      const ch1Link = screen.getByRole('link', { name: 'Chapter 1' })
      expect(ch1Link.className).toContain('min-h-[44px]')
      expect(ch1Link.className).toContain('min-w-[44px]')
    })

    it('accordion headers have aria-expanded', () => {
      renderPage()
      const otButton = screen.getByText('Old Testament').closest('button')!
      expect(otButton).toHaveAttribute('aria-expanded')
    })
  })

  describe('highlights & notes empty state', () => {
    it('shows empty state when no highlights and no notes', () => {
      renderPage()
      expect(
        screen.getByText('Your Bible is ready to mark up'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Tap any verse while reading to highlight it or add a personal note.',
        ),
      ).toBeInTheDocument()
    })

    it('CTA links to /bible/john/1', () => {
      renderPage()
      const link = screen.getByRole('link', { name: /start reading/i })
      expect(link).toHaveAttribute('href', '/bible/john/1')
    })
  })
})
