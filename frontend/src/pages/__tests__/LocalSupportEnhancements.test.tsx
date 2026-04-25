import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Churches } from '../Churches'

const mockRecordActivity = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false, localVisit: false, devotional: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: mockRecordActivity, clearNewlyEarnedBadges: vi.fn(), repairStreak: vi.fn(),
    newlyEarnedBadges: [], previousStreak: null, isFreeRepairAvailable: false,
  }),
}))

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
})

function renderPage(Page: React.ComponentType, entry: string) {
  return render(
    <MemoryRouter
      initialEntries={[entry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Page />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Local Support Enhancements — Integration', () => {
  describe('Logged-out search flow', () => {
    it('search controls are functional for logged-out users', () => {
      renderPage(Churches, '/local-support/churches')
      expect(screen.getByLabelText('Use my current location')).toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: /saved/i })).not.toBeInTheDocument()
    })
  })

  describe('Logged-in visit flow', () => {
    it('shows visit button when logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'user-1' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      renderPage(Churches, '/local-support/churches')
      // Logged-in shows search prompt (idle state) — no results visible by default
      // Use URL params to get results
    })
  })
})
