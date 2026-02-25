import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { GrowthTeasersSection } from '@/components/GrowthTeasersSection'

function renderGrowthTeasers() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GrowthTeasersSection />
    </MemoryRouter>
  )
}

describe('GrowthTeasersSection', () => {
  it('renders as a named section landmark', () => {
    renderGrowthTeasers()
    expect(
      screen.getByRole('region', { name: /see how you're growing/i })
    ).toBeInTheDocument()
  })

  it('renders the heading with "Growing" text', () => {
    renderGrowthTeasers()
    expect(
      screen.getByRole('heading', { level: 2, name: /see how you're growing/i })
    ).toBeInTheDocument()
  })

  it('renders the subheading text', () => {
    renderGrowthTeasers()
    expect(
      screen.getByText(/create a free account and unlock your personal dashboard/i)
    ).toBeInTheDocument()
  })

  it('renders 3 card titles', () => {
    renderGrowthTeasers()
    expect(screen.getByText('Mood Insights')).toBeInTheDocument()
    expect(screen.getByText('Streaks & Faith Points')).toBeInTheDocument()
    expect(screen.getByText('Friends & Leaderboard')).toBeInTheDocument()
  })

  it('renders card descriptions', () => {
    renderGrowthTeasers()
    expect(
      screen.getByText(/see how god is meeting you over time/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/build daily habits and watch your faith grow/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/grow together and encourage each other/i)
    ).toBeInTheDocument()
  })

  it('renders CTA button linking to /register', () => {
    renderGrowthTeasers()
    const link = screen.getByRole('link', { name: /create a free account/i })
    expect(link).toHaveAttribute('href', '/register')
  })

  it('renders reassurance text', () => {
    renderGrowthTeasers()
    expect(
      screen.getByText(/it's free\. no catch\./i)
    ).toBeInTheDocument()
  })

  it('cards have staggered transition delays', () => {
    renderGrowthTeasers()
    const cards = screen.getAllByTestId('growth-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].style.transitionDelay).toBe('0ms')
    expect(cards[1].style.transitionDelay).toBe('200ms')
    expect(cards[2].style.transitionDelay).toBe('400ms')
  })
})
