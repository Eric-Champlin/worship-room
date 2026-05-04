import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TodaysDevotionalCard } from '../TodaysDevotionalCard'

// Mock devotional data
const MOCK_DEVOTIONAL = {
  id: 'devotional-01',
  dayIndex: 0,
  title: 'Anchored in Trust',
  theme: 'trust' as const,
  quote: { text: 'Test quote', attribution: 'Author' },
  passage: { reference: 'Proverbs 3:5-6', verses: [] },
  reflection: [
    'There are seasons in life when the road ahead feels unclear.',
    'Second paragraph.',
  ],
  prayer: 'Test prayer',
  reflectionQuestion: 'Test question?',
}

vi.mock('@/data/devotionals', () => ({
  getTodaysDevotional: () => MOCK_DEVOTIONAL,
}))

function renderCard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TodaysDevotionalCard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('TodaysDevotionalCard', () => {
  it('renders devotional title', () => {
    renderCard()
    expect(screen.getByText('Anchored in Trust')).toBeInTheDocument()
  })

  it('renders theme pill with formatted name', () => {
    renderCard()
    expect(screen.getByText('Trust')).toBeInTheDocument()
    const pill = screen.getByText('Trust')
    expect(pill).toHaveClass('rounded-full', 'bg-white/[0.05]', 'text-xs', 'text-white/70')
  })

  it('renders 2-line reflection preview', () => {
    renderCard()
    const preview = screen.getByText(/There are seasons in life/)
    expect(preview).toBeInTheDocument()
    expect(preview).toHaveClass('line-clamp-2')
  })

  it('renders "Read today\'s devotional" CTA when unread', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /Read today's devotional/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
    expect(link).toHaveClass('text-white/80')
  })

  it('renders green checkmark when read', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))

    renderCard()
    const check = screen.getByLabelText('Completed')
    expect(check).toBeInTheDocument()
  })

  it('renders "Read again" CTA when read', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))

    renderCard()
    const link = screen.getByRole('link', { name: /Read again/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveClass('text-white/50')
  })

  it('checkmark has aria-label "Completed"', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))

    renderCard()
    expect(screen.getByLabelText('Completed')).toBeInTheDocument()
  })

  it('CTA link navigates to /daily?tab=devotional', () => {
    renderCard()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
  })

  it('does not show checkmark when unread', () => {
    renderCard()
    expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument()
  })
})
