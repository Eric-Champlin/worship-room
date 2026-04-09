import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { _resetForTesting as resetStreakStore } from '@/lib/bible/streakStore'
import { BibleLanding } from '../BibleLanding'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/bible/votdSelector', () => ({
  getTodaysBibleVotd: () => ({
    reference: 'Psalms 23:1',
    book: 'Psalms',
    chapter: 23,
    verse: 1,
    text: 'Yahweh is my shepherd; I shall lack nothing.',
  }),
}))

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <AuthModalProvider>
            <BibleLanding />
          </AuthModalProvider>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('BibleLanding', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStreakStore()
    mockNavigate.mockClear()
  })

  it('renders landing page without errors', () => {
    expect(() => renderLanding()).not.toThrow()
  })

  it('empty state: shows first-run cards', () => {
    renderLanding()
    expect(screen.getByText('Start your first reading')).toBeInTheDocument()
    expect(screen.getByText('Try a reading plan')).toBeInTheDocument()
    // No streak chip visible
    expect(screen.queryByText(/day streak/)).not.toBeInTheDocument()
  })

  it('resume state: shows Resume Reading card', () => {
    localStorage.setItem(
      'wr_bible_last_read',
      JSON.stringify({ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() })
    )
    renderLanding()
    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument()
    expect(screen.getByText('John 3')).toBeInTheDocument()
  })

  it('plan state: shows Today\'s Plan card', () => {
    localStorage.setItem(
      'wr_bible_active_plans',
      JSON.stringify([
        {
          planId: 'gospel-john',
          currentDay: 3,
          totalDays: 14,
          planName: 'Gospel of John',
          todayReading: 'John 3:1-21',
          startedAt: Date.now(),
        },
      ])
    )
    renderLanding()
    expect(screen.getByText('Gospel of John')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('streak chip visible when count > 0', () => {
    localStorage.setItem(
      'bible:streak',
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastReadDate: '2026-04-07',
        streakStartDate: '2026-04-03',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [3],
        totalDaysRead: 5,
      }),
    )
    renderLanding()
    expect(screen.getByText('5 day streak')).toBeInTheDocument()
  })

  it('streak chip hidden when count is 0', () => {
    renderLanding()
    expect(screen.queryByText(/day streak/)).not.toBeInTheDocument()
  })

  it('VOTD always renders', () => {
    renderLanding()
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
    expect(screen.getByText(/Yahweh is my shepherd/)).toBeInTheDocument()
    expect(screen.getByText('Psalms 23:1')).toBeInTheDocument()
  })

  it('search submits to /bible/search', () => {
    renderLanding()
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'love' } })
    fireEvent.submit(input)
    expect(mockNavigate).toHaveBeenCalledWith('/bible/search?q=love')
  })

  it('quick actions render all 3 cards', () => {
    renderLanding()
    expect(screen.getByText('Browse Books')).toBeInTheDocument()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
  })

  it('footer note visible', () => {
    renderLanding()
    expect(
      screen.getByText('World English Bible (WEB) — Public Domain — No account, ever.')
    ).toBeInTheDocument()
  })

  it('hero uses gradient text, no font-script in hero', () => {
    renderLanding()
    const heading = screen.getByText('The Word of God')
    expect(heading).toBeInTheDocument()
    expect(screen.getByText('open to you')).toBeInTheDocument()
    // Verify no font-script within the hero section itself
    const heroSection = heading.closest('section')
    expect(heroSection?.querySelector('.font-script')).toBeNull()
  })

  it('progress bar has correct ARIA attributes', () => {
    localStorage.setItem(
      'wr_bible_active_plans',
      JSON.stringify([
        {
          planId: 'gospel-john',
          currentDay: 7,
          totalDays: 21,
          planName: 'Psalms Journey',
          todayReading: 'Psalms 7:1-17',
          startedAt: Date.now(),
        },
      ])
    )
    renderLanding()
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('7')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('21')
  })
})
