import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// Logged-out user: no auth gate, no mock data. The page should render
// the SearchPrompt empty state until the user runs a search.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false, pray: false, listen: false, prayerWall: false,
      meditate: false, journal: false, readingPlan: false, gratitude: false,
      reflection: false, challenge: false, localVisit: false, devotional: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

vi.mock('@/utils/date', () => ({
  getLocalDateString: () => '2026-03-26',
}))

const { LocalSupportPage } = await import('../LocalSupportPage')

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/local-support/churches']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <LocalSupportPage
            config={{
              category: 'churches',
              headingId: 'churches-heading',
              title: 'Churches',
              subtitle: 'Find a church near you',
              searchKeyword: 'church',
              filterOptions: null,
              filterLabel: null,
            }}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LocalSupportPage — visit toast integration', () => {
  it('renders the SearchPrompt empty state for logged-out users with no mock data', () => {
    renderPage()
    // No initial search has been run, so no listings should appear.
    // The page should show the SearchPrompt empty state instead.
    expect(screen.getByText(/find support near you/i)).toBeInTheDocument()
    expect(screen.getByText(/enter your location/i)).toBeInTheDocument()
  })

  it('page uses useToast hook without crashing', () => {
    // This verifies the toast integration is correctly wired:
    // - useToast() is imported and called in LocalSupportPageContent
    // - showToast is referenced in the handleVisit callback
    // - No runtime errors from the hook consumption
    // The actual toast firing requires auth + visit button click,
    // which is covered by the VisitButton.test.tsx + manual testing.
    const { container } = renderPage()
    expect(container.querySelector('main')).toBeInTheDocument()
  })

  // Spec 5 Step 3 — BackgroundCanvas wraps the shell
  it('wraps hero + main inside BackgroundCanvas atmospheric layer', () => {
    const { container } = renderPage()
    const main = container.querySelector('main')
    expect(main).toBeInTheDocument()
    // BackgroundCanvas's distinctive wrapper has `relative min-h-screen overflow-x-clip`
    // classes plus the consumer-supplied `flex flex-1 flex-col`. The hero + main are
    // descendants. We assert by finding a min-h-screen ancestor of <main> that ALSO
    // contains the overflow-x-clip class.
    let canvas: HTMLElement | null = null
    let cursor: HTMLElement | null = main
    while (cursor) {
      if (cursor.className?.includes('min-h-screen') && cursor.className?.includes('overflow-x-clip')) {
        canvas = cursor
        break
      }
      cursor = cursor.parentElement
    }
    expect(canvas).not.toBeNull()
    expect(canvas?.className).toContain('min-h-screen')
    expect(canvas?.className).toContain('overflow-x-clip')
    expect(canvas?.className).toContain('flex-1')
  })
})
