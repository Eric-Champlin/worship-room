import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingPlanWidget } from '../ReadingPlanWidget'
import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test' } }),
}))

beforeEach(() => {
  localStorage.clear()
})

function renderWidget() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ReadingPlanWidget />
    </MemoryRouter>,
  )
}

describe('ReadingPlanWidget', () => {
  it('discovery state: shows suggested plans when no active plan', () => {
    renderWidget()
    expect(screen.getByText('Start a guided journey')).toBeInTheDocument()
    expect(screen.getByText('Browse all plans')).toBeInTheDocument()
  })

  it('discovery state: falls back to beginner plans with no mood data', () => {
    renderWidget()
    // Should show up to 3 beginner plans
    const links = screen.getAllByRole('link')
    const planLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/reading-plans/'))
    expect(planLinks.length).toBeGreaterThanOrEqual(1)
    expect(planLinks.length).toBeLessThanOrEqual(4) // 3 plans + "Browse all"
  })

  it('active state: shows plan title and progress bar', () => {
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01',
          currentDay: 3,
          completedDays: [1, 2],
          completedAt: null,
        },
      }),
    )
    renderWidget()
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText(/Day 3 of 7/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Reading plan progress')
    expect(screen.getByText('Continue reading')).toBeInTheDocument()
  })

  it('active state: shows correct day fraction', () => {
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01',
          currentDay: 4,
          completedDays: [1, 2, 3],
          completedAt: null,
        },
      }),
    )
    renderWidget()
    expect(screen.getByText(/Day 4 of 7 \(43%\)/)).toBeInTheDocument()
  })

  it('active state: shows Continue reading link', () => {
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01',
          currentDay: 2,
          completedDays: [1],
          completedAt: null,
        },
      }),
    )
    renderWidget()
    const link = screen.getByText('Continue reading')
    expect(link.closest('a')).toHaveAttribute('href', '/reading-plans/finding-peace-in-anxiety')
  })

  it('completed state: shows plan title and checkmark', () => {
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: '2026-01-01',
          currentDay: 7,
          completedDays: [1, 2, 3, 4, 5, 6, 7],
          completedAt: '2026-01-07',
        },
      }),
    )
    renderWidget()
    expect(screen.getByText(/You completed Finding Peace in Anxiety!/)).toBeInTheDocument()
    expect(screen.getByText('Start another plan')).toBeInTheDocument()
  })

  it('all plans completed: shows achievement message', () => {
    const progress: Record<string, unknown> = {}
    const planIds = [
      'finding-peace-in-anxiety',
      'walking-through-grief',
      'the-gratitude-reset',
      'knowing-who-you-are-in-christ',
      'the-path-to-forgiveness',
      'learning-to-trust-god',
      'hope-when-its-hard',
      'healing-from-the-inside-out',
      'discovering-your-purpose',
      'building-stronger-relationships',
    ]
    for (const id of planIds) {
      progress[id] = {
        startedAt: '2026-01-01',
        currentDay: 7,
        completedDays: [1, 2, 3, 4, 5, 6, 7],
        completedAt: '2026-01-07',
      }
    }
    localStorage.setItem(READING_PLAN_PROGRESS_KEY, JSON.stringify(progress))
    renderWidget()
    expect(screen.getByText("You've completed all plans!")).toBeInTheDocument()
  })
})
