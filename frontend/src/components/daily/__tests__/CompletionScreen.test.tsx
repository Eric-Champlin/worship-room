import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { CompletionScreen } from '../CompletionScreen'
import { getMeditationHistory } from '@/services/meditation-storage'

vi.mock('@/services/meditation-storage', () => ({
  getMeditationHistory: vi.fn(() => []),
}))

vi.mock('../MiniHubCards', () => ({
  MiniHubCards: () => <div data-testid="mini-hub-cards" />,
}))

const DEFAULT_CTAS = [
  { label: 'Try a different meditation', to: '/daily?tab=meditate', primary: true },
  { label: 'Continue to Pray', to: '/daily?tab=pray' },
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function mockHistory(count: number, minutesEach: number) {
  const sessions = Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    type: 'breathing' as const,
    date: '2026-03-20',
    durationMinutes: minutesEach,
    completedAt: new Date().toISOString(),
  }))
  vi.mocked(getMeditationHistory).mockReturnValue(sessions)
}

describe('CompletionScreen', () => {
  it('renders cumulative meditation stats when showMeditationStats is true', () => {
    mockHistory(10, 4.5)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} showMeditationStats />)
    expect(screen.getByText(/You've meditated 10 times for 45 total minutes/)).toBeInTheDocument()
  })

  it('hides meditation stats when showMeditationStats is false or omitted', () => {
    mockHistory(10, 5)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} />)
    expect(screen.queryByText(/You've meditated/)).not.toBeInTheDocument()
  })

  it('shows insights link when 7+ sessions exist', () => {
    mockHistory(7, 5)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} showMeditationStats />)
    const link = screen.getByRole('link', { name: /View your meditation trends/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/insights#meditation-history')
  })

  it('hides insights link when fewer than 7 sessions', () => {
    mockHistory(6, 5)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} showMeditationStats />)
    expect(screen.queryByText(/View your meditation trends/)).not.toBeInTheDocument()
  })

  it('shows insights link with correct styling', () => {
    mockHistory(10, 5)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} showMeditationStats />)
    const link = screen.getByRole('link', { name: /View your meditation trends/ })
    expect(link.className).toContain('text-primary-lt')
    expect(link.className).toContain('text-sm')
  })

  it('handles empty meditation history gracefully', () => {
    mockHistory(0, 0)
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} showMeditationStats />)
    expect(screen.getByText(/You've meditated 0 times for 0 total minutes/)).toBeInTheDocument()
  })

  it('renders title and CTAs correctly', () => {
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} />)
    expect(screen.getByText('Well done!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Try a different meditation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to Pray' })).toBeInTheDocument()
  })

  it('renders MiniHubCards', () => {
    renderWithRouter(<CompletionScreen ctas={DEFAULT_CTAS} />)
    expect(screen.getByTestId('mini-hub-cards')).toBeInTheDocument()
  })
})
