import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChallengeStrip } from '../ChallengeStrip'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockIsAuthenticated = false
const mockGetActiveChallenge = vi.fn(() => undefined as ReturnType<typeof activeReturn>)

function activeReturn() {
  return undefined as
    | {
        challengeId: string
        progress: {
          joinedAt: string
          currentDay: number
          completedDays: number[]
          completedAt: string | null
          streak: number
          missedDays: number[]
          status: 'active'
        }
      }
    | undefined
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? { name: 'Eric', id: 'u1' } : null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useChallengeProgress', () => ({
  useChallengeProgress: () => ({
    getActiveChallenge: mockGetActiveChallenge,
    getProgress: vi.fn(),
    joinChallenge: vi.fn(),
    completeDay: vi.fn(),
    isChallengeJoined: vi.fn(),
    isChallengeCompleted: vi.fn(),
    pauseChallenge: vi.fn(),
    resumeChallenge: vi.fn(),
    getReminders: vi.fn(),
    toggleReminder: vi.fn(),
  }),
}))

vi.mock('@/data/challenges', () => {
  const challenge = {
    id: 'pray40-lenten-journey',
    title: 'Pray40: A Lenten Journey',
    description: 'A 40-day Lenten challenge',
    season: 'lent',
    getStartDate: () => new Date('2026-03-05'),
    durationDays: 40,
    icon: 'Heart',
    themeColor: '#6B21A8',
    dailyContent: [
      {
        dayNumber: 1,
        title: 'Turning to God',
        scripture: { reference: 'Joel 2:12-13', text: 'Turn to me...' },
        reflection: 'Lent begins...',
        dailyAction: 'Pray for a clean heart and fresh start',
        actionType: 'pray',
      },
      {
        dayNumber: 2,
        title: 'Simplicity',
        scripture: { reference: 'Matt 6:19-21', text: 'Do not store...' },
        reflection: 'Simplicity is...',
        dailyAction: 'Journal about one thing you can release today',
        actionType: 'journal',
      },
    ],
    communityGoal: '10,000 prayers',
  }
  return {
    getChallenge: (id: string) => (id === 'pray40-lenten-journey' ? challenge : undefined),
    CHALLENGES: [challenge],
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStrip() {
  return render(
    <MemoryRouter>
      <ChallengeStrip />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockIsAuthenticated = false
  mockGetActiveChallenge.mockReturnValue(undefined)
})

describe('ChallengeStrip', () => {
  it('renders for authenticated user with active challenge', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: {
        joinedAt: '2026-03-05',
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        streak: 0,
        missedDays: [],
        status: 'active',
      },
    })
    renderStrip()
    expect(screen.getByText(/Day 1:/)).toBeInTheDocument()
    expect(screen.getByText(/Pray for a clean heart/)).toBeInTheDocument()
  })

  it('does not render for logged-out users', () => {
    mockIsAuthenticated = false
    const { container } = renderStrip()
    expect(container.innerHTML).toBe('')
  })

  it('does not render when no active challenge', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue(undefined)
    const { container } = renderStrip()
    expect(container.innerHTML).toBe('')
  })

  it('shows correct day and action text', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: {
        joinedAt: '2026-03-05',
        currentDay: 2,
        completedDays: [1],
        completedAt: null,
        streak: 1,
        missedDays: [],
        status: 'active',
      },
    })
    renderStrip()
    expect(screen.getByText(/Day 2:/)).toBeInTheDocument()
    expect(screen.getByText(/Journal about one thing/)).toBeInTheDocument()
  })

  it('links to challenge detail page', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: {
        joinedAt: '2026-03-05',
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        streak: 0,
        missedDays: [],
        status: 'active',
      },
    })
    renderStrip()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/challenges/pray40-lenten-journey')
  })

  it('truncates long action text', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: {
        joinedAt: '2026-03-05',
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        streak: 0,
        missedDays: [],
        status: 'active',
      },
    })
    renderStrip()
    const textSpan = screen.getByText(/Pray for a clean heart/).closest('span')
    expect(textSpan?.className).toContain('truncate')
  })

  it('has accessible link label', () => {
    mockIsAuthenticated = true
    mockGetActiveChallenge.mockReturnValue({
      challengeId: 'pray40-lenten-journey',
      progress: {
        joinedAt: '2026-03-05',
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        streak: 0,
        missedDays: [],
        status: 'active',
      },
    })
    renderStrip()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('aria-label', expect.stringContaining('Pray40: A Lenten Journey'))
    expect(link).toHaveAttribute('aria-label', expect.stringContaining('Day 1'))
  })
})
