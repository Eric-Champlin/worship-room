import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWallDashboard } from '../PrayerWallDashboard'

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

function LoginPage() {
  return <p>Login Page</p>
}

describe('PrayerWallDashboard (logged out)', () => {
  it('redirects to login when not logged in', () => {
    render(
      <MemoryRouter
        initialEntries={['/prayer-wall/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ToastProvider>
        <AuthModalProvider>
        <Routes>
          <Route path="/prayer-wall/dashboard" element={<PrayerWallDashboard />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        </AuthModalProvider>
        </ToastProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
