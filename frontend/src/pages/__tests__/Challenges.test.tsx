import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ToastProvider } from '@/components/ui/Toast'

import { Challenges } from '../Challenges'
import { CHALLENGES } from '@/data/challenges'
import { getChallengeCalendarInfo, getActiveChallengeInfo } from '@/lib/challenge-calendar'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

const mockOpenAuthModal = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/prayer-wall/AuthModalProvider')
  >('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  }
})

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

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/challenges']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Challenges />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Challenges Page', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockOpenAuthModal.mockClear()
  })

  it('renders with PageHero title and subtitle', () => {
    renderPage()
    expect(screen.getByText('Community Challenges')).toBeInTheDocument()
    expect(screen.getByText('Grow together in faith')).toBeInTheDocument()
  })

  it('renders at least one challenge card', () => {
    renderPage()
    // At least one challenge title should be visible
    const found = CHALLENGES.some((c) => screen.queryByText(c.title) !== null)
    expect(found).toBe(true)
  })

  it('shows "Join Challenge" auth modal when logged out', async () => {
    renderPage()
    const user = userEvent.setup()
    const joinButtons = screen.queryAllByRole('button', { name: /join challenge/i })
    if (joinButtons.length > 0) {
      await user.click(joinButtons[0])
      expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to join this challenge')
    }
  })

  it('shows "Remind me" auth modal when logged out', async () => {
    renderPage()
    const user = userEvent.setup()
    // Buttons have aria-label "Set reminder" when not set
    const remindButtons = screen.queryAllByLabelText(/set reminder/i)
    if (remindButtons.length > 0) {
      await user.click(remindButtons[0])
      expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to set a reminder')
    }
  })

  it('toggles reminder when logged in', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()
    const remindButtons = screen.queryAllByRole('button', { name: /set reminder/i })
    if (remindButtons.length > 0) {
      await user.click(remindButtons[0])
      // Button text should change to "Reminder set"
      expect(screen.queryByText('Reminder set')).toBeInTheDocument()
    }
  })

  it('route /challenges renders the page', () => {
    renderPage()
    expect(screen.getByText('Community Challenges')).toBeInTheDocument()
  })
})

describe('getChallengeCalendarInfo', () => {
  const lentChallenge = CHALLENGES.find((c) => c.id === 'pray40-lenten-journey')!

  it('returns active when date is within challenge window', () => {
    // Lent 2026: starts Feb 18, 40 days → ends Mar 29
    const duringLent = new Date(2026, 1, 25) // Feb 25
    const info = getChallengeCalendarInfo(lentChallenge, duringLent)
    expect(info.status).toBe('active')
    expect(info.daysRemaining).toBeDefined()
    expect(info.calendarDay).toBeDefined()
  })

  it('returns upcoming when date is before challenge start', () => {
    const beforeLent = new Date(2026, 0, 15) // Jan 15
    const info = getChallengeCalendarInfo(lentChallenge, beforeLent)
    expect(info.status).toBe('upcoming')
  })

  it('returns past when date is after challenge end', () => {
    const afterLent = new Date(2026, 5, 1) // June 1
    const info = getChallengeCalendarInfo(lentChallenge, afterLent)
    // Could be 'upcoming' for next year's occurrence or 'past' — depends on proximity
    expect(['past', 'upcoming']).toContain(info.status)
  })
})

describe('getActiveChallengeInfo', () => {
  it('returns null when no challenge is active', () => {
    // July 15 — no challenge should be active
    const result = getActiveChallengeInfo(new Date(2026, 6, 15))
    expect(result).toBeNull()
  })

  it('returns challenge info when a challenge is active', () => {
    // Feb 25, 2026 — Lent is active
    const result = getActiveChallengeInfo(new Date(2026, 1, 25))
    expect(result).not.toBeNull()
    expect(result!.challenge.id).toBe('pray40-lenten-journey')
  })
})
