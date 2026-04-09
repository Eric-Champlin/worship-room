import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ShareSubView } from '../ShareSubView'
import { ToastProvider } from '@/components/ui/Toast'
import type { VerseSelection } from '@/types/verse-actions'

// Mock canvas renderer
vi.mock('@/lib/bible/shareCardRenderer', () => ({
  renderShareCard: vi.fn().mockResolvedValue(new Blob(['card'], { type: 'image/png' })),
  renderShareThumbnail: vi.fn().mockResolvedValue(new Blob(['thumb'], { type: 'image/png' })),
}))

// Mock share actions
vi.mock('@/lib/bible/shareActions', () => ({
  buildShareUrl: vi.fn().mockReturnValue('worshiproom.com/bible/john/3'),
  buildShareFilename: vi.fn().mockReturnValue('worship-room-john-3-16.png'),
  canShareFiles: vi.fn().mockReturnValue(false),
  downloadImage: vi.fn().mockResolvedValue(undefined),
  copyImage: vi.fn().mockResolvedValue(undefined),
  shareImage: vi.fn().mockResolvedValue(undefined),
}))

// Mock highlight store
const mockGetHighlight = vi.fn().mockReturnValue(null)
vi.mock('@/lib/bible/highlightStore', () => ({
  getHighlightForVerse: (...args: unknown[]) => mockGetHighlight(...args),
}))

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

const shortSelection: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world.' }],
}

const longSelection: VerseSelection = {
  book: 'psalms',
  bookName: 'Psalms',
  chapter: 119,
  startVerse: 1,
  endVerse: 10,
  verses: Array.from({ length: 10 }, (_, i) => ({
    number: i + 1,
    text: 'Blessed are those whose way is blameless, who walk in the law of the Lord. Blessed are those who keep his testimonies, who seek him with their whole heart.',
  })),
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  )
}

function renderSubView(sel: VerseSelection = shortSelection) {
  return render(
    <ShareSubView selection={sel} onBack={vi.fn()} />,
    { wrapper: Wrapper },
  )
}

describe('ShareSubView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHighlight.mockReturnValue(null)
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test')
    URL.revokeObjectURL = vi.fn()
  })

  it('renders verse reference subtitle', () => {
    renderSubView()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
  })

  it('renders 4 format thumbnails', () => {
    renderSubView()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
  })

  it('Square is selected by default', () => {
    renderSubView()
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
  })

  it('clicking format updates selection', () => {
    renderSubView()
    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]) // Story
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  it('arrow key navigation cycles formats', () => {
    renderSubView()
    const radiogroup = screen.getByRole('radiogroup')
    fireEvent.keyDown(radiogroup, { key: 'ArrowRight' })
    const radios = screen.getAllByRole('radio')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('long passage warning appears when >800 chars', () => {
    renderSubView(longSelection)
    expect(
      screen.getByText(/consider sharing a shorter selection/),
    ).toBeInTheDocument()
  })

  it('long passage warning hidden for short text', () => {
    renderSubView(shortSelection)
    expect(screen.queryByText(/consider sharing a shorter selection/)).not.toBeInTheDocument()
  })

  it('"Include reference" toggle defaults on', () => {
    renderSubView()
    const switches = screen.getAllByRole('switch')
    const refSwitch = switches.find((s) =>
      s.parentElement?.textContent?.includes('Include reference'),
    )
    expect(refSwitch).toHaveAttribute('aria-checked', 'true')
  })

  it('"Match my highlight color" visible when highlight exists', () => {
    mockGetHighlight.mockReturnValue({ color: 'joy' })
    renderSubView()
    expect(screen.getByText('Match my highlight color')).toBeInTheDocument()
  })

  it('"Match my highlight color" hidden when no highlight', () => {
    mockGetHighlight.mockReturnValue(null)
    renderSubView()
    expect(screen.queryByText('Match my highlight color')).not.toBeInTheDocument()
  })

  it('Download button present', () => {
    renderSubView()
    expect(screen.getByText('Download')).toBeInTheDocument()
  })

  it('Copy button present', () => {
    renderSubView()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('Share button hidden when canShareFiles() is false', async () => {
    renderSubView()
    // canShareFiles mock returns false by default
    expect(screen.queryByText('Share')).not.toBeInTheDocument()
  })

  it('Share button visible when canShareFiles() is true', async () => {
    const { canShareFiles: mockCanShare } = await import('@/lib/bible/shareActions')
    vi.mocked(mockCanShare).mockReturnValue(true)
    renderSubView()
    expect(screen.getByText('Share')).toBeInTheDocument()
  })

  it('all action buttons have ≥44px tap target', () => {
    renderSubView()
    const downloadBtn = screen.getByText('Download').closest('button')
    const copyBtn = screen.getByText('Copy').closest('button')
    expect(downloadBtn?.className).toContain('min-h-[44px]')
    expect(copyBtn?.className).toContain('min-h-[44px]')
  })

  it('footer caption text present', () => {
    renderSubView()
    expect(screen.getByText('Cards include a link back to Worship Room')).toBeInTheDocument()
  })
})
