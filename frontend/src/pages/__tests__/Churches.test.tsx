import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Churches } from '../Churches'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false, localVisit: false, devotional: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(), clearNewlyEarnedBadges: vi.fn(), repairStreak: vi.fn(),
    newlyEarnedBadges: [], previousStreak: null, isFreeRepairAvailable: false,
  }),
}))

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/churches']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Churches />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Churches', () => {
  it('renders hero with "Find a Church Near You" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Find a Church Near You', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders functional search controls for logged-out users', () => {
    renderPage()
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
  })

  it('renders mock listing cards for logged-out users', () => {
    renderPage()
    expect(screen.getAllByText('First Baptist Church of Columbia').length).toBeGreaterThan(0)
  })

  it('does not show Saved tab for logged-out users', () => {
    renderPage()
    expect(screen.queryByRole('tab', { name: /saved/i })).not.toBeInTheDocument()
  })

  it('shows only Search Results tab for logged-out users', () => {
    renderPage()
    expect(screen.getByRole('tab', { name: /search results/i })).toBeInTheDocument()
  })

  it('does not show bookmark buttons for logged-out users', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /bookmark/i })).not.toBeInTheDocument()
  })
})
