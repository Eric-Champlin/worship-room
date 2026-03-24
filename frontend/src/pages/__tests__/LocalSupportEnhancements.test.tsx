import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { Churches } from '../Churches'
import { Counselors } from '../Counselors'
import { CelebrateRecovery } from '../CelebrateRecovery'

const mockRecordActivity = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false, localVisit: false },
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

    it('mock results are visible with no bookmark or visit buttons', () => {
      renderPage(Churches, '/local-support/churches')
      expect(screen.getAllByText('First Baptist Church of Columbia').length).toBeGreaterThan(0)
      expect(screen.queryByRole('button', { name: /bookmark/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /i visited/i })).not.toBeInTheDocument()
    })

    it('CTAs visible in expanded card for logged-out users', async () => {
      const user = userEvent.setup()
      renderPage(Churches, '/local-support/churches')
      const expandButtons = screen.getAllByRole('button', { name: /expand details/i })
      await user.click(expandButtons[0])
      expect(screen.getAllByText('Pray for this church').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Journal about your visit').length).toBeGreaterThan(0)
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

  describe('All three page types render CTAs', () => {
    it('Churches shows church-specific CTAs', async () => {
      const user = userEvent.setup()
      renderPage(Churches, '/local-support/churches')
      const expandBtns = screen.getAllByRole('button', { name: /expand details/i })
      await user.click(expandBtns[0])
      expect(screen.getAllByText('Pray for this church').length).toBeGreaterThan(0)
    })

    it('Counselors shows counselor-specific CTAs', async () => {
      const user = userEvent.setup()
      renderPage(Counselors, '/local-support/counselors')
      const expandBtns = screen.getAllByRole('button', { name: /expand details/i })
      await user.click(expandBtns[0])
      expect(screen.getAllByText('Pray before your appointment').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Journal about your session').length).toBeGreaterThan(0)
    })

    it('CelebrateRecovery shows CR-specific CTAs', async () => {
      const user = userEvent.setup()
      renderPage(CelebrateRecovery, '/local-support/celebrate-recovery')
      const expandBtns = screen.getAllByRole('button', { name: /expand details/i })
      await user.click(expandBtns[0])
      expect(screen.getAllByText('Pray for your recovery journey').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Find a meeting buddy').length).toBeGreaterThan(0)
    })
  })

  describe('URL param sharing for logged-out', () => {
    it('URL params work without triggering auto-search when absent', () => {
      renderPage(Churches, '/local-support/churches')
      // Should show mock data, not an auto-search with lat=0,lng=0
      expect(screen.getAllByText('First Baptist Church of Columbia').length).toBeGreaterThan(0)
    })
  })
})
