import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWallDashboard } from '../PrayerWallDashboard'

// Mock useAuth to return a logged-in user for dashboard testing
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Sarah Johnson' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

function renderDashboard() {
  return render(
    <MemoryRouter
      initialEntries={['/prayer-wall/dashboard']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
      <AuthModalProvider>
      <Routes>
        <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
      </Routes>
      </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('PrayerWallDashboard', () => {
  it('renders 5 tabs', () => {
    renderDashboard()
    expect(screen.getByRole('tab', { name: 'My Prayers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'My Comments' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Bookmarks' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Reactions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument()
  })

  it('Settings tab shows notification toggles with "coming soon" banner', async () => {
    const user = userEvent.setup()
    renderDashboard()
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(screen.getByText('Notifications coming soon')).toBeInTheDocument()
    expect(screen.getByText('Someone prays for my prayer')).toBeInTheDocument()
    expect(screen.getByText('Someone comments on my prayer')).toBeInTheDocument()
  })

  it('"Change Photo" button shows "coming soon"', () => {
    renderDashboard()
    const photoBtn = screen.getByText('Change Photo (coming soon)')
    expect(photoBtn).toBeInTheDocument()
    expect(photoBtn).toBeDisabled()
  })

  it('shows breadcrumb instead of back link', () => {
    renderDashboard()
    expect(screen.queryByText('Back to Prayer Wall')).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('My Dashboard')
  })

  it('shows edit buttons for name and bio', () => {
    renderDashboard()
    expect(screen.getByLabelText('Edit name')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit bio')).toBeInTheDocument()
  })
})
