import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { CelebrateRecovery } from '../CelebrateRecovery'

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
      initialEntries={['/local-support/celebrate-recovery']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <CelebrateRecovery />
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('CelebrateRecovery', () => {
  it('renders hero with "Find Celebrate Recovery" heading', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Find Celebrate Recovery', level: 1 }),
    ).toBeInTheDocument()
  })

  it('renders CR explainer section', () => {
    renderPage()
    expect(screen.getByText(/what is celebrate recovery\?/i)).toBeInTheDocument()
    expect(screen.getByText(/christ-centered, 12-step recovery program/i)).toBeInTheDocument()
  })

  it('renders search controls for logged-out users in teaser mode', () => {
    renderPage()
    expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
  })

})
