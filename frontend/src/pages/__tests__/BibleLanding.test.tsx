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

vi.mock('@/hooks/bible/useVerseOfTheDay', () => ({
  useVerseOfTheDay: () => ({
    votd: {
      entry: {
        ref: 'Psalms 23:1',
        book: 'psalms',
        chapter: 23,
        startVerse: 1,
        endVerse: 1,
        theme: 'provision',
      },
      verseText: 'Yahweh is my shepherd; I shall lack nothing.',
      bookName: 'Psalms',
      wordCount: 8,
    },
    isLoading: false,
  }),
}))

vi.mock('@/lib/bible/bookmarkStore', () => ({
  toggleBookmark: vi.fn().mockReturnValue({ created: false, bookmark: null }),
  isSelectionBookmarked: vi.fn().mockReturnValue(false),
  setBookmarkLabel: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
}))

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn().mockResolvedValue({
    bookSlug: 'john',
    chapter: 3,
    verses: [
      { number: 1, text: 'Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.' },
    ],
    paragraphs: [],
  }),
  getAdjacentChapter: vi.fn().mockReturnValue({
    bookSlug: 'john',
    bookName: 'John',
    chapter: 4,
  }),
}))

// Mock useActivePlan so BibleHeroSlot doesn't trigger its bridge-writing
// useEffect, which would clobber the `wr_bible_active_plans` localStorage
// entries that several tests below write directly. BB-21's plansStore writes
// to that key as a downstream bridge; if the bridge fires during mount it
// overwrites any test-authored value before BibleLanding's own `getActivePlans`
// call reads it. The mock returns null progress, which makes BibleHeroSlot
// fall through to its default render (VOTD only, no plan resume card), and
// the test's localStorage write reaches BibleLanding's useEffect intact.
vi.mock('@/hooks/bible/useActivePlan', () => ({
  useActivePlan: () => ({
    activePlan: null,
    progress: null,
    currentDay: null,
    isOnPlanPassage: () => false,
    markDayComplete: vi.fn(),
    pausePlan: vi.fn(),
    switchPlan: vi.fn(),
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

  it('empty state: shows VOTD for first-time reader', () => {
    renderLanding()
    // First-time reader: VOTD shown, no resume card
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
    expect(screen.queryByText('Continue reading')).not.toBeInTheDocument()
    // Plan card returns null when no active plans (BB-50)
    expect(screen.queryByText('Try a reading plan')).not.toBeInTheDocument()
    // No streak chip visible
    expect(screen.queryByText(/day streak/)).not.toBeInTheDocument()
  })

  it('resume state: shows Resume Reading card (active reader)', () => {
    localStorage.setItem(
      'wr_bible_last_read',
      JSON.stringify({ book: 'John', chapter: 3, verse: 16, timestamp: Date.now() })
    )
    renderLanding()
    expect(screen.getByText('Continue reading')).toBeInTheDocument()
    expect(screen.getByText('John 3')).toBeInTheDocument()
  })

  it('plan state: shows Today\'s Plan card', async () => {
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
    // Plans are loaded inside a useEffect via getActivePlans(), so the first
    // render has plans=[] and the assertions must wait for the post-effect
    // render where TodaysPlanCard rehydrates from localStorage.
    expect(await screen.findByText('Gospel of John')).toBeInTheDocument()
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
  })

  it('streak chip visible when count > 0 AND user is logged in', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Test User')
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

  it('streak chip hidden when logged out even if streak > 0', () => {
    // No wr_auth_simulated set → logged out
    // Use a streak value with no matching milestones so no milestone toast fires
    // (the toast "N day streak!" would also match /day streak/ and confuse the query).
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
        milestones: [],
        totalDaysRead: 5,
      }),
    )
    renderLanding()
    expect(screen.queryByText('5 day streak')).not.toBeInTheDocument()
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

  it('footer note is removed', () => {
    renderLanding()
    expect(
      screen.queryByText('World English Bible (WEB) — Public Domain — No account, ever.')
    ).not.toBeInTheDocument()
  })

  it('hero uses gradient text, no font-script in hero', () => {
    renderLanding()
    const heading = screen.getByText('Your')
    expect(heading).toBeInTheDocument()
    // "Study Bible" also appears in the Navbar; scope the assertion to the hero section
    const heroSection = heading.closest('section')
    expect(heroSection).not.toBeNull()
    expect(heroSection!.textContent).toContain('Study Bible')
    // Verify no font-script within the hero section itself
    expect(heroSection?.querySelector('.font-script')).toBeNull()
  })

  it('progress bar has correct ARIA attributes', async () => {
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
    // Plans load via useEffect → getActivePlans(); progressbar appears after
    // the post-effect render rehydrates from localStorage.
    const progressbar = await screen.findByRole('progressbar')
    expect(progressbar.getAttribute('aria-valuenow')).toBe('7')
    expect(progressbar.getAttribute('aria-valuemin')).toBe('1')
    expect(progressbar.getAttribute('aria-valuemax')).toBe('21')
  })

  it('BibleHeroSlot renders within the page', () => {
    renderLanding()
    // Verify the VOTD renders as part of the hero slot composition
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
  })

  it('TodaysPlanCard returns null when no active plans', () => {
    renderLanding()
    // BB-50: empty plan state now returns null instead of showing a CTA
    expect(screen.queryByText('Try a reading plan')).not.toBeInTheDocument()
  })

  it('renders with transparent Navbar (Daily Hub root pattern)', () => {
    const { container } = renderLanding()
    // Navbar in transparent variant applies `bg-transparent` to the <nav> element
    const navEl = container.querySelector('nav[aria-label="Main navigation"]')
    expect(navEl?.className).toContain('bg-transparent')
  })

  it('does NOT wrap in Layout max-w-7xl main', () => {
    const { container } = renderLanding()
    const maxW7xlElements = container.querySelectorAll('[class*="max-w-7xl"]')
    expect(maxW7xlElements.length).toBe(0)
  })

  it('renders all core content sections (streak, hero slot, quick actions, search)', () => {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Test User')
    localStorage.setItem(
      'bible:streak',
      JSON.stringify({
        currentStreak: 3,
        longestStreak: 3,
        lastReadDate: '2026-04-07',
        streakStartDate: '2026-04-05',
        graceDaysAvailable: 1,
        graceDaysUsedThisWeek: 0,
        lastGraceUsedDate: null,
        weekResetDate: '2026-04-06',
        milestones: [],
        totalDaysRead: 3,
      }),
    )
    renderLanding()
    // Streak chip visible
    expect(screen.getByText('3 day streak')).toBeInTheDocument()
    // Hero slot VOTD visible
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
    // Quick actions row rendering all 3 cards
    expect(screen.getByText('Browse Books')).toBeInTheDocument()
    expect(screen.getByText('My Bible')).toBeInTheDocument()
    expect(screen.getByText('Reading Plans')).toBeInTheDocument()
    // Search entry
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
})
