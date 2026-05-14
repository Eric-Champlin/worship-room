import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getTodaysQuestion } from '@/constants/question-of-the-day'

vi.mock('@/hooks/useQotdToday', () => ({
  useQotdToday: vi.fn(),
}))
vi.mock('@/hooks/useWatchMode', () => ({
  useWatchMode: vi.fn(),
}))

import { useQotdToday } from '@/hooks/useQotdToday'
import { useWatchMode } from '@/hooks/useWatchMode'
import { QotdSidebar } from '../QotdSidebar'

const defaultProps = {
  responseCount: 7,
  isComposerOpen: false,
  onToggleComposer: vi.fn(),
  onScrollToResponses: vi.fn(),
}

function renderSidebar() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <QotdSidebar {...defaultProps} />
    </MemoryRouter>,
  )
}

describe('QotdSidebar', () => {
  beforeEach(() => {
    vi.mocked(useQotdToday).mockReturnValue({
      question: getTodaysQuestion(),
      isLoading: false,
      source: 'fallback',
    })
    vi.mocked(useWatchMode).mockReturnValue({
      active: false,
      source: 'auto',
      userPreference: 'off',
      degraded: true,
    })
  })

  it('forwards props to QuestionOfTheDay (renders QOTD content)', () => {
    renderSidebar()
    // The underlying QOTD widget renders today's question text when not loading.
    const todaysQuestion = getTodaysQuestion()
    expect(screen.getByText(todaysQuestion.text)).toBeInTheDocument()
  })

  it('renders a QOTD eyebrow label from the underlying widget', () => {
    renderSidebar()
    // Match the canonical QOTD eyebrow copy (case-insensitive).
    expect(screen.getByText(/question of the day/i)).toBeInTheDocument()
  })
})
