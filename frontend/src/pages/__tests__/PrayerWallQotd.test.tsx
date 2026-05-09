import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { PrayerWall } from '../PrayerWall'
import { getTodaysQuestion } from '@/constants/question-of-the-day'

const mockRecordActivity = vi.fn()

// Default: logged-out
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

// Spec 3.9 — QuestionOfTheDay reads from useQotdToday(). Mock to return the
// constants-derived question synchronously so these integration tests don't
// hit the network and don't see the skeleton state.
vi.mock('@/hooks/useQotdToday', () => ({
  useQotdToday: () => ({
    question: getTodaysQuestion(),
    isLoading: false,
    source: 'fallback',
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: mockRecordActivity,
  }),
}))

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

describe('PrayerWall QOTD Integration', () => {
  it('QOTD card renders on Prayer Wall', () => {
    renderPage()
    const question = getTodaysQuestion()
    expect(screen.getByText(question.text)).toBeInTheDocument()
    expect(screen.getByText('Question of the Day')).toBeInTheDocument()
  })

  it('QOTD card visible when category filter is active', () => {
    renderPage('/prayer-wall?category=health')
    const question = getTodaysQuestion()
    expect(screen.getByText(question.text)).toBeInTheDocument()
  })

  it('"Discussion" filter shows QOTD responses', () => {
    renderPage('/prayer-wall?category=discussion')
    // Mock data includes 3 QOTD responses with category 'discussion'
    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
    // At least one should have the QOTD badge
    expect(screen.getAllByText('Re: Question of the Day').length).toBeGreaterThan(0)
  })

  it('non-discussion filter excludes QOTD responses', () => {
    renderPage('/prayer-wall?category=health')
    const articles = screen.getAllByRole('article')
    // None should be discussion category
    for (const article of articles) {
      expect(article).not.toHaveTextContent('Re: Question of the Day')
    }
  })

  it('response count reflects QOTD responses from mock data', () => {
    renderPage()
    // Mock data has 4 prayers with qotdId === todaysQuestionId (a 4th was
    // added during Spec 4.5; the test expectation went stale and surfaced
    // when the full test suite was run during Spec 4.6b cleanup).
    expect(screen.getByText('4 responses')).toBeInTheDocument()
  })

  it('"Share Your Thoughts" button is visible on QOTD card', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Share Your Thoughts' })).toBeInTheDocument()
  })
})

describe('PrayerWall QOTD Auth Gating (logged out)', () => {
  it('logged-out: "Share Your Thoughts" triggers auth modal', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Share Your Thoughts' }))

    // Auth modal should appear with the sign-in message
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })
})
