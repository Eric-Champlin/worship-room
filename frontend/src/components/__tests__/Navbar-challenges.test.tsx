import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ToastProvider } from '@/components/ui/Toast'

import { Navbar } from '../Navbar'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: () => ({
    icon: 'Leaf',
    themeColor: '#059669',
    isNamedSeason: false,
    seasonName: 'Ordinary Time',
    seasonLabel: 'Ordinary Time',
  }),
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
      readingPlan: false,
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

function renderNavbar() {
  return render(
    <MemoryRouter
      initialEntries={['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Navbar />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Navbar — Challenges link', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('"Challenges" link appears in the nav', () => {
    renderNavbar()
    const challengeLinks = screen.getAllByText('Challenges')
    expect(challengeLinks.length).toBeGreaterThan(0)
  })

  it('"Challenges" link points to /challenges', () => {
    renderNavbar()
    const links = screen.getAllByRole('link').filter(
      (el) => el.textContent?.includes('Challenges'),
    )
    const hasCorrectLink = links.some((link) =>
      link.getAttribute('href') === '/challenges',
    )
    expect(hasCorrectLink).toBe(true)
  })

  it('does not break existing nav links', () => {
    renderNavbar()
    expect(screen.getAllByText('Daily Hub').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Prayer Wall').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Music').length).toBeGreaterThan(0)
  })
})
