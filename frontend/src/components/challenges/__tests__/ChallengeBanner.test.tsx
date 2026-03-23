import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChallengeBanner } from '../ChallengeBanner'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOpenAuthModal = vi.fn()
const mockJoinChallenge = vi.fn(() => undefined)
const mockGetProgress = vi.fn((): ReturnType<typeof mockProgressReturn> => undefined)
const mockGetActiveChallenge = vi.fn(() => undefined)
const mockPauseChallenge = vi.fn()
const mockNavigate = vi.fn()

let mockIsAuthenticated = false

function mockProgressReturn() {
  return undefined as
    | {
        joinedAt: string
        currentDay: number
        completedDays: number[]
        completedAt: string | null
        streak: number
        missedDays: number[]
        status: 'active' | 'completed' | 'paused' | 'abandoned'
      }
    | undefined
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? { name: 'Eric', id: 'u1' } : null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

vi.mock('@/hooks/useChallengeProgress', () => ({
  useChallengeProgress: () => ({
    getProgress: mockGetProgress,
    joinChallenge: mockJoinChallenge,
    getActiveChallenge: mockGetActiveChallenge,
    pauseChallenge: mockPauseChallenge,
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // instant dismiss for testing
}))

// Active challenge info mock
let mockActiveInfo: { challengeId: string; daysRemaining: number; calendarDay: number } | null = null

vi.mock('@/lib/challenge-calendar', () => ({
  getActiveChallengeInfo: () => mockActiveInfo,
  getChallengeCalendarInfo: (challenge: { id: string }) => {
    if (mockActiveInfo && mockActiveInfo.challengeId === challenge.id) {
      return {
        status: 'active' as const,
        startDate: new Date('2026-03-05'),
        endDate: new Date('2026-04-13'),
        daysRemaining: mockActiveInfo.daysRemaining,
        calendarDay: mockActiveInfo.calendarDay,
      }
    }
    return { status: 'past' as const, startDate: new Date('2025-03-05'), endDate: new Date('2025-04-13') }
  },
}))

const MOCK_LENT = {
  id: 'pray40-lenten-journey',
  title: 'Pray40: A Lenten Journey',
  description: 'A 40-day Lenten challenge',
  season: 'lent',
  getStartDate: () => new Date('2026-03-05'),
  durationDays: 40,
  icon: 'Heart',
  themeColor: '#6B21A8',
  dailyContent: [],
  communityGoal: '10,000 prayers',
}

vi.mock('@/data/challenges', () => ({
  CHALLENGES: [
    {
      id: 'pray40-lenten-journey',
      title: 'Pray40: A Lenten Journey',
      description: 'A 40-day Lenten challenge',
      season: 'lent',
      getStartDate: () => new Date('2026-03-05'),
      durationDays: 40,
      icon: 'Heart',
      themeColor: '#6B21A8',
      dailyContent: [],
      communityGoal: '10,000 prayers',
    },
  ],
  getChallenge: (id: string) => {
    if (id === 'pray40-lenten-journey') return MOCK_LENT
    return undefined
  },
}))

vi.mock('@/constants/challenges', () => ({
  getParticipantCount: () => 1234,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderBanner() {
  return render(
    <MemoryRouter>
      <ChallengeBanner />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  mockActiveInfo = null
  mockIsAuthenticated = false
  mockGetProgress.mockReturnValue(undefined)
  mockGetActiveChallenge.mockReturnValue(undefined)
})

afterEach(() => {
  sessionStorage.clear()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChallengeBanner', () => {
  it('renders banner when active challenge season exists', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    expect(screen.getByText('Pray40: A Lenten Journey')).toBeInTheDocument()
    expect(screen.getByText('1,234 participants')).toBeInTheDocument()
  })

  it('does not render when no active season', () => {
    mockActiveInfo = null
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('shows "Join the Challenge" for logged-out users', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    expect(screen.getByText('Join the Challenge')).toBeInTheDocument()
  })

  it('triggers auth modal on logged-out "Join" click', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    fireEvent.click(screen.getByText('Join the Challenge'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to join this challenge')
  })

  it('shows "Continue Today\'s Challenge" for active participants', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    mockIsAuthenticated = true
    mockGetProgress.mockReturnValue({
      joinedAt: '2026-03-05',
      currentDay: 10,
      completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      completedAt: null,
      streak: 9,
      missedDays: [],
      status: 'active',
    })

    renderBanner()
    expect(screen.getByText("Continue Today's Challenge")).toBeInTheDocument()
    expect(screen.getByText('Day 10 of 40')).toBeInTheDocument()
  })

  it('navigates to detail page on "Continue" click', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    mockIsAuthenticated = true
    mockGetProgress.mockReturnValue({
      joinedAt: '2026-03-05',
      currentDay: 10,
      completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      completedAt: null,
      streak: 9,
      missedDays: [],
      status: 'active',
    })

    renderBanner()
    fireEvent.click(screen.getByText("Continue Today's Challenge"))
    expect(mockNavigate).toHaveBeenCalledWith('/challenges/pray40-lenten-journey')
  })

  it('dismiss hides banner and writes sessionStorage', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    fireEvent.click(screen.getByLabelText('Dismiss challenge banner'))
    expect(sessionStorage.getItem('wr_challenge_banner_dismissed_pray40-lenten-journey')).toBe('true')
  })

  it('does not render when banner was dismissed this session', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    sessionStorage.setItem('wr_challenge_banner_dismissed_pray40-lenten-journey', 'true')
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('shows days remaining for non-participants', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    expect(screen.getByText('20 days')).toBeInTheDocument()
    expect(screen.getByText(/remaining/)).toBeInTheDocument()
  })

  it('dismiss button has accessible aria-label', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    expect(screen.getByLabelText('Dismiss challenge banner')).toBeInTheDocument()
  })

  it('CTA has 44px minimum touch target', () => {
    mockActiveInfo = { challengeId: 'pray40-lenten-journey', daysRemaining: 20, calendarDay: 10 }
    renderBanner()
    const cta = screen.getByText('Join the Challenge')
    expect(cta.className).toContain('min-h-[44px]')
  })
})
