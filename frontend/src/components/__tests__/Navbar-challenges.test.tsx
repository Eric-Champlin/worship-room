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
    currentSeason: {
      id: 'ordinary-time',
      name: 'Ordinary Time',
      themeColor: '#059669',
      icon: 'Leaf',
      greeting: '',
      suggestedContent: ['growth', 'discipleship', 'daily faithfulness'],
      themeWord: 'growth',
    },
    icon: 'Leaf',
    themeColor: '#059669',
    isNamedSeason: false,
    seasonName: 'Ordinary Time',
    greeting: '',
    daysUntilNextSeason: 30,
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

describe('Navbar — Challenges/Grow link', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('"Challenges" is no longer a standalone top-level nav item', () => {
    renderNavbar()
    // Challenges was consolidated into the "Grow" link
    const challengeLinks = screen.queryAllByRole('link').filter(
      (el) => el.textContent?.trim() === 'Challenges',
    )
    expect(challengeLinks).toHaveLength(0)
  })

  it('"Grow" link appears as a top-level nav item pointing to /grow', () => {
    renderNavbar()
    const growLink = screen.getByRole('link', { name: 'Grow' })
    expect(growLink).toHaveAttribute('href', '/grow')
  })

  it('does not break existing nav links', () => {
    renderNavbar()
    expect(screen.getAllByText('Daily Hub').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Prayer Wall').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Music').length).toBeGreaterThan(0)
  })
})
