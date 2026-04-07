import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BooksDrawerContent } from '../BooksDrawerContent'

function renderContent(props?: Partial<{ onClose: () => void; onSelectBook: (s: string) => void }>) {
  const onClose = props?.onClose ?? vi.fn()
  const onSelectBook = props?.onSelectBook ?? vi.fn()
  return render(
    <MemoryRouter>
      <BooksDrawerContent onClose={onClose} onSelectBook={onSelectBook} />
    </MemoryRouter>
  )
}

describe('BooksDrawerContent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders "Books of the Bible" heading', () => {
    renderContent()
    expect(screen.getByText('Books of the Bible')).toBeInTheDocument()
  })

  it('renders close button with aria-label', () => {
    renderContent()
    expect(screen.getByLabelText('Close books drawer')).toBeInTheDocument()
  })

  it('renders search input with placeholder', () => {
    renderContent()
    expect(screen.getByPlaceholderText('Find a book')).toBeInTheDocument()
  })

  it('renders OT tab active by default', () => {
    renderContent()
    const tabs = screen.getAllByRole('tab')
    const otTab = tabs.find((t) => t.textContent === 'Old Testament')!
    expect(otTab).toHaveAttribute('aria-selected', 'true')
  })

  it('renders 5 OT categories', () => {
    renderContent()
    expect(screen.getByText('Law')).toBeInTheDocument()
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Wisdom & Poetry')).toBeInTheDocument()
    expect(screen.getByText('Major Prophets')).toBeInTheDocument()
    expect(screen.getByText('Minor Prophets')).toBeInTheDocument()
  })

  it('renders 39 OT book cards', () => {
    renderContent()
    // Each book card is a button with the book name
    const buttons = screen.getAllByRole('button').filter((btn) => {
      // Exclude tab buttons and close button
      return !btn.getAttribute('role')?.includes('tab') && !btn.getAttribute('aria-label')
    })
    expect(buttons).toHaveLength(39)
  })

  it('switches to NT tab', () => {
    renderContent()
    fireEvent.click(screen.getByText('New Testament'))
    expect(screen.getByText('Gospels')).toBeInTheDocument()
    expect(screen.getByText('Pauline Epistles')).toBeInTheDocument()
    expect(screen.getByText('General Epistles')).toBeInTheDocument()
    expect(screen.getByText('Apocalyptic')).toBeInTheDocument()
  })

  it('NT renders 27 book cards', () => {
    renderContent()
    fireEvent.click(screen.getByText('New Testament'))
    const buttons = screen.getAllByRole('button').filter((btn) => {
      return !btn.getAttribute('role')?.includes('tab') && !btn.getAttribute('aria-label')
    })
    expect(buttons).toHaveLength(27)
  })

  it('search filters books', () => {
    renderContent()
    fireEvent.change(screen.getByPlaceholderText('Find a book'), { target: { value: 'psa' } })
    expect(screen.getByText('Psalms')).toBeInTheDocument()
    // Genesis should not be visible
    expect(screen.queryByText('Genesis')).not.toBeInTheDocument()
  })

  it('search resolves abbreviation "rev"', () => {
    renderContent()
    fireEvent.change(screen.getByPlaceholderText('Find a book'), { target: { value: 'rev' } })
    expect(screen.getByText('Revelation')).toBeInTheDocument()
  })

  it('search resolves "1cor"', () => {
    renderContent()
    fireEvent.change(screen.getByPlaceholderText('Find a book'), { target: { value: '1cor' } })
    expect(screen.getByText('1 Corinthians')).toBeInTheDocument()
  })

  it('search hides tabs and category headers', () => {
    renderContent()
    fireEvent.change(screen.getByPlaceholderText('Find a book'), { target: { value: 'gen' } })
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('Law')).not.toBeInTheDocument()
  })

  it('clearing search restores categorized view', () => {
    renderContent()
    const input = screen.getByPlaceholderText('Find a book')
    fireEvent.change(input, { target: { value: 'gen' } })
    expect(screen.queryByText('Law')).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Law')).toBeInTheDocument()
  })

  it('Enter selects first result', () => {
    const onSelectBook = vi.fn()
    render(
      <MemoryRouter>
        <BooksDrawerContent onClose={vi.fn()} onSelectBook={onSelectBook} />
      </MemoryRouter>
    )
    const input = screen.getByPlaceholderText('Find a book')
    fireEvent.change(input, { target: { value: 'gene' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelectBook).toHaveBeenCalledWith('genesis')
  })

  it('book card calls onSelectBook', () => {
    const onSelectBook = vi.fn()
    render(
      <MemoryRouter>
        <BooksDrawerContent onClose={vi.fn()} onSelectBook={onSelectBook} />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('Genesis'))
    expect(onSelectBook).toHaveBeenCalledWith('genesis')
  })

  it('shows progress bar when progress data exists', () => {
    localStorage.setItem('wr_bible_progress', JSON.stringify({ genesis: [1, 2, 3] }))
    const { container } = renderContent()
    // Find the Genesis card and look for the progress bar inside
    const genesisButton = screen.getByText('Genesis').closest('button')!
    const progressBar = genesisButton.querySelector('.bg-primary\\/60')
    expect(progressBar).toBeInTheDocument()
  })

  it('hides progress bar when no progress', () => {
    renderContent()
    const genesisButton = screen.getByText('Genesis').closest('button')!
    const progressBar = genesisButton.querySelector('.bg-primary\\/60')
    expect(progressBar).not.toBeInTheDocument()
  })

  it('persists tab selection to localStorage', () => {
    renderContent()
    fireEvent.click(screen.getByText('New Testament'))
    expect(localStorage.getItem('wr_bible_books_tab')).toBe('NT')
  })

  it('reads persisted tab on mount', () => {
    localStorage.setItem('wr_bible_books_tab', 'NT')
    renderContent()
    const tabs = screen.getAllByRole('tab')
    const ntTab = tabs.find((t) => t.textContent === 'New Testament')!
    expect(ntTab).toHaveAttribute('aria-selected', 'true')
  })

  it('footer shows "66 books · World English Bible"', () => {
    renderContent()
    expect(screen.getByText('66 books · World English Bible')).toBeInTheDocument()
  })

  it('category headers have uppercase muted styling', () => {
    renderContent()
    const lawHeader = screen.getByText('Law')
    expect(lawHeader.tagName).toBe('H3')
    expect(lawHeader.className).toContain('uppercase')
    expect(lawHeader.className).toContain('text-white/50')
  })

  it('search input receives focus on drawer open', async () => {
    renderContent()
    // Auto-focus uses a 50ms timeout
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Find a book'))
    })
  })

  it('/ key focuses search input inside drawer', async () => {
    renderContent()
    // Wait for initial auto-focus
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Find a book'))
    })
    // Blur the search input
    ;(document.activeElement as HTMLElement)?.blur()
    expect(document.activeElement).not.toBe(screen.getByPlaceholderText('Find a book'))
    // Press /
    fireEvent.keyDown(document, { key: '/' })
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Find a book'))
  })

})
