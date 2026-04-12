import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn().mockReturnValue({ isOnline: false }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false,
      pray: false,
      listen: false,
      prayerWall: false,
      meditate: false,
      journal: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

import { PrayerWall } from '../PrayerWall'

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

describe('PrayerWall offline', () => {
  it('shows OfflineNotice when offline', () => {
    renderPage()
    expect(screen.getByText("You're offline")).toBeInTheDocument()
    expect(
      screen.getByText(/Prayer Wall needs an internet connection/),
    ).toBeInTheDocument()
  })

  it('shows fallback CTA to Daily Hub when offline', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Go to Daily Hub/ })).toBeInTheDocument()
  })

  it('does not render the Prayer Wall hero when offline', () => {
    renderPage()
    expect(
      screen.queryByRole('heading', { name: 'Prayer Wall', level: 1 }),
    ).not.toBeInTheDocument()
  })
})
