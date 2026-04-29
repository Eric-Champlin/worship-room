import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QuestionOfTheDay } from '../QuestionOfTheDay'
import { getTodaysQuestion } from '@/constants/question-of-the-day'

vi.mock('@/hooks/useQotdToday', () => ({
  useQotdToday: vi.fn(),
}))
import { useQotdToday } from '@/hooks/useQotdToday'

const defaultProps = {
  responseCount: 0,
  isComposerOpen: false,
  onToggleComposer: vi.fn(),
  onScrollToResponses: vi.fn(),
}

function renderCard(overrides: Partial<typeof defaultProps> = {}) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QuestionOfTheDay {...defaultProps} {...overrides} />
    </MemoryRouter>,
  )
}

describe('QuestionOfTheDay', () => {
  // Default mock: loaded state with the constants-derived question (matches pre-3.9 behavior).
  beforeEach(() => {
    vi.mocked(useQotdToday).mockReturnValue({
      question: getTodaysQuestion(),
      isLoading: false,
      source: 'fallback',
    })
  })

  it('renders skeleton state while loading', () => {
    vi.mocked(useQotdToday).mockReturnValueOnce({
      question: null,
      isLoading: true,
      source: null,
    })
    renderCard()

    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText("Loading today's question")).toHaveClass('sr-only')
    // Visible label + icon stay during skeleton.
    expect(screen.getByText('Question of the Day')).toBeInTheDocument()
  })

  it('renders MessageCircle icon', () => {
    renderCard()
    const question = getTodaysQuestion()
    const section = screen.getByRole('region', { name: question.text })
    expect(section.querySelector('svg')).toBeInTheDocument()
  })

  it('renders "Question of the Day" label', () => {
    renderCard()
    expect(screen.getByText('Question of the Day')).toBeInTheDocument()
  })

  it('renders today\'s question text', () => {
    renderCard()
    const question = getTodaysQuestion()
    expect(screen.getByText(question.text)).toBeInTheDocument()
  })

  it('renders hint when question has one', () => {
    // getTodaysQuestion() may or may not have a hint; we test the component renders it
    const question = getTodaysQuestion()
    renderCard()
    if (question.hint) {
      expect(screen.getByText(question.hint)).toBeInTheDocument()
    }
  })

  it('shows "Be the first to respond" when 0 responses', () => {
    renderCard({ responseCount: 0 })
    expect(screen.getByText('Be the first to respond')).toBeInTheDocument()
  })

  it('shows "1 response" when 1 response', () => {
    renderCard({ responseCount: 1 })
    expect(screen.getByText('1 response')).toBeInTheDocument()
  })

  it('shows "X responses" when > 1', () => {
    renderCard({ responseCount: 5 })
    expect(screen.getByText('5 responses')).toBeInTheDocument()
  })

  it('response count tap calls onScrollToResponses when > 0', async () => {
    const user = userEvent.setup()
    const onScrollToResponses = vi.fn()
    renderCard({ responseCount: 3, onScrollToResponses })

    await user.click(screen.getByText('3 responses'))
    expect(onScrollToResponses).toHaveBeenCalled()
  })

  it('response count tap calls onToggleComposer when 0', async () => {
    const user = userEvent.setup()
    const onToggleComposer = vi.fn()
    renderCard({ responseCount: 0, onToggleComposer })

    await user.click(screen.getByText('Be the first to respond'))
    expect(onToggleComposer).toHaveBeenCalled()
  })

  it('"Share Your Thoughts" calls onToggleComposer', async () => {
    const user = userEvent.setup()
    const onToggleComposer = vi.fn()
    renderCard({ onToggleComposer })

    await user.click(screen.getByRole('button', { name: 'Share Your Thoughts' }))
    expect(onToggleComposer).toHaveBeenCalled()
  })

  it('Share button renders', () => {
    renderCard()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  it('card has section with aria-labelledby', () => {
    renderCard()
    const question = getTodaysQuestion()
    const section = screen.getByRole('region', { name: question.text })
    expect(section).toHaveAttribute('aria-labelledby', 'qotd-heading')
  })
})
