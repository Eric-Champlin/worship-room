import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { AskResponseDisplay } from '../AskResponseDisplay'
import { ASK_RESPONSES } from '@/mocks/ask-mock-data'

const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn(() => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/hooks/useBibleNotes', () => ({
  useBibleNotes: () => ({
    saveNote: vi.fn(() => true),
    getNoteForVerse: vi.fn(() => undefined),
    getNotesForChapter: vi.fn(() => []),
    deleteNote: vi.fn(),
    getAllNotes: vi.fn(() => []),
  }),
}))

const SUFFERING_RESPONSE = ASK_RESPONSES.suffering

function renderDisplay(props: Partial<Parameters<typeof AskResponseDisplay>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <AskResponseDisplay
            response={SUFFERING_RESPONSE}
            isFirstResponse={false}
            onFollowUpClick={vi.fn()}
            {...props}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('AskResponseDisplay', () => {
  it('renders answer paragraphs', () => {
    renderDisplay()
    expect(screen.getByText(/one of the hardest questions/i)).toBeInTheDocument()
  })

  it('renders 3 verse cards', () => {
    renderDisplay()
    // References appear in both inline text and verse cards
    expect(screen.getAllByText('Romans 8:28').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Psalm 34:18').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2 Corinthians 1:3-4').length).toBeGreaterThanOrEqual(1)
  })

  it('verse card references are links to Bible reader', () => {
    renderDisplay()
    const links = screen.getAllByRole('link', { name: 'Romans 8:28' })
    const verseCardLink = links.find((l) => l.className.includes('decoration-primary/60'))
    expect(verseCardLink).toHaveAttribute('href', '/bible/romans/8#verse-28')
  })

  it('verse card reference links use WCAG-fixed text-white + underline (not text-primary-lt)', () => {
    renderDisplay()
    const links = screen.getAllByRole('link', { name: 'Romans 8:28' })
    const verseCardLink = links.find((l) => l.className.includes('decoration-primary/60'))
    expect(verseCardLink?.className).toContain('text-white')
    expect(verseCardLink?.className).toContain('underline')
    expect(verseCardLink?.className).toContain('decoration-primary/60')
    expect(verseCardLink?.className).not.toContain('text-primary-lt')
  })

  it('renders encouragement callout', () => {
    renderDisplay()
    expect(screen.getByText(/Your pain matters to God/i)).toBeInTheDocument()
  })

  it('renders prayer section', () => {
    renderDisplay()
    expect(screen.getByText('Pray About This')).toBeInTheDocument()
    expect(screen.getByText(/Lord, I am hurting/i)).toBeInTheDocument()
  })

  it('renders AI disclaimer', () => {
    renderDisplay()
    expect(
      screen.getByText('AI-generated content for encouragement. Not professional advice.'),
    ).toBeInTheDocument()
  })

  it('shows action buttons only for first response', () => {
    renderDisplay({ isFirstResponse: true, onAskAnother: vi.fn() })
    expect(screen.getByRole('button', { name: /Ask another question/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Journal about this/i })).toBeInTheDocument()
  })

  it('hides action buttons for non-first responses', () => {
    renderDisplay({ isFirstResponse: false })
    expect(screen.queryByRole('button', { name: /Ask another question/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Journal about this/i })).not.toBeInTheDocument()
  })

  it('shows feedback row only for first response', () => {
    renderDisplay({ isFirstResponse: true, onFeedback: vi.fn() })
    expect(screen.getByText('Was this helpful?')).toBeInTheDocument()
  })

  it('hides feedback row for non-first responses', () => {
    renderDisplay({ isFirstResponse: false })
    expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument()
  })

  it('"Ask another question" button calls onAskAnother', () => {
    const onAskAnother = vi.fn()
    renderDisplay({ isFirstResponse: true, onAskAnother })
    fireEvent.click(screen.getByRole('button', { name: /Ask another question/i }))
    expect(onAskAnother).toHaveBeenCalled()
  })

  it('"Ask another question" retains white-pill primary chrome', () => {
    renderDisplay({ isFirstResponse: true, onAskAnother: vi.fn() })
    const btn = screen.getByRole('button', { name: /Ask another question/i })
    expect(btn.className).toContain('bg-white')
    expect(btn.className).toContain('text-primary')
    // Must NOT have the subtle frosted chrome
    expect(btn.className).not.toContain('bg-white/[0.07]')
  })

  it('secondary action buttons (Journal, Pray, Share) use subtle frosted chrome', () => {
    renderDisplay({ isFirstResponse: true, onJournal: vi.fn(), onPray: vi.fn(), onShare: vi.fn() })
    const journal = screen.getByRole('button', { name: /Journal about this/i })
    const pray = screen.getByRole('button', { name: /Pray about this/i })
    // VerseCardActions also has Share buttons (labeled "Share <reference>"); use exact match
    const share = screen.getByRole('button', { name: 'Share' })
    for (const btn of [journal, pray, share]) {
      // Subtle variant: frosted glass background
      expect(btn.className).toContain('bg-white/[0.07]')
      expect(btn.className).toContain('border-white/[0.12]')
      // NOT white pill primary chrome
      expect(btn.className).not.toContain('text-primary')
    }
  })

  it('"Highlight in Bible" buttons render for each verse card', () => {
    renderDisplay()
    const buttons = screen.getAllByRole('button', { name: /Highlight in Bible/i })
    expect(buttons).toHaveLength(3) // One per verse card
  })

  it('"Save note" buttons render for each verse card', () => {
    renderDisplay()
    const buttons = screen.getAllByRole('button', { name: /Save note/i })
    expect(buttons).toHaveLength(3)
  })

  it('"Memorize" buttons render for each parsed verse card', () => {
    renderDisplay()
    const buttons = screen.getAllByRole('button', { name: /Memorize|Memorized/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})

describe('AskResponseDisplay — isLatestResponse prop', () => {
  it('adds id="latest-response-heading" to h2 when isLatestResponse=true', () => {
    renderDisplay({ isLatestResponse: true })
    const h2 = screen.getByRole('heading', { level: 2, name: 'What Scripture Says' })
    expect(h2).toHaveAttribute('id', 'latest-response-heading')
  })

  it('adds tabIndex="-1" to h2 when isLatestResponse=true', () => {
    renderDisplay({ isLatestResponse: true })
    const h2 = screen.getByRole('heading', { level: 2, name: 'What Scripture Says' })
    expect(h2).toHaveAttribute('tabIndex', '-1')
  })

  it('omits id from h2 when isLatestResponse=false', () => {
    renderDisplay({ isLatestResponse: false })
    const h2 = screen.getByRole('heading', { level: 2, name: 'What Scripture Says' })
    expect(h2).not.toHaveAttribute('id')
  })

  it('omits id from h2 when isLatestResponse is not passed', () => {
    renderDisplay()
    const h2 = screen.getByRole('heading', { level: 2, name: 'What Scripture Says' })
    expect(h2).not.toHaveAttribute('id')
  })
})
