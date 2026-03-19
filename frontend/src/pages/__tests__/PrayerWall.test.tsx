import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

function renderPage(initialEntry = '/prayer-wall') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <PrayerWall />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWall', () => {
  it('renders hero with "Prayer Wall" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Prayer Wall', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders prayer cards from mock data', () => {
    renderPage()
    // Should render prayer cards as articles
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
  })

  it('"Share a Prayer Request" button is visible', () => {
    renderPage()
    // At least one "Share a Prayer Request" element should exist
    const buttons = screen.getAllByText('Share a Prayer Request')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('Pray button toggles and updates count', async () => {
    const user = userEvent.setup()
    renderPage()
    // Find the first pray button
    const prayButtons = screen.getAllByLabelText(/praying for this request/i)
    const firstBtn = prayButtons[0]
    const countBefore = firstBtn.textContent

    await user.click(firstBtn)
    const countAfter = firstBtn.textContent
    // Count should have changed
    expect(countAfter).not.toBe(countBefore)
  })

  it('cards have correct accessible landmarks', () => {
    renderPage()
    // Prayer cards are rendered as <article> elements
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
    // Hero section has an aria-label
    expect(screen.getByRole('region', { name: 'Prayer Wall' })).toBeInTheDocument()
  })

  it('renders skip to content link', () => {
    renderPage()
    expect(screen.getByText('Skip to content')).toBeInTheDocument()
  })

  it('renders filter bar with "All" and category pills', () => {
    renderPage()
    expect(screen.getByRole('toolbar', { name: /filter prayers by category/i })).toBeInTheDocument()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('clicking a filter pill reduces visible prayer cards', async () => {
    const user = userEvent.setup()
    renderPage()
    const allArticlesBefore = screen.getAllByRole('article').length

    // Click "Health" filter — should show only health prayers (2 out of 18)
    await user.click(screen.getByRole('button', { name: 'Health' }))
    const allArticlesAfter = screen.getAllByRole('article').length
    expect(allArticlesAfter).toBeLessThan(allArticlesBefore)
  })

  it('filter bar pills include "All"', () => {
    renderPage()
    const allBtn = screen.getByRole('button', { name: 'All' })
    expect(allBtn).toBeInTheDocument()
    expect(allBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('URL param pre-selects filter', () => {
    renderPage('/prayer-wall?category=health')
    const toolbar = screen.getByRole('toolbar')
    const healthPill = within(toolbar).getByRole('button', { name: /Health/i })
    expect(healthPill).toHaveAttribute('aria-pressed', 'true')
    const allPill = within(toolbar).getByRole('button', { name: 'All' })
    expect(allPill).toHaveAttribute('aria-pressed', 'false')
  })
})
