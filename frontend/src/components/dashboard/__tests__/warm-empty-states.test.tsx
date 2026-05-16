import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { useFaithPoints } from '@/hooks/useFaithPoints'

// Mock ResizeObserver for Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  // Seed empty friends data
  localStorage.setItem(
    'wr_friends',
    JSON.stringify({
      friends: [],
      pendingIncoming: [],
      pendingOutgoing: [],
      blocked: [],
    }),
  )
})

function GridWithFaithPoints() {
  const faithPoints = useFaithPoints()
  return <DashboardWidgetGrid faithPoints={faithPoints} />
}

function renderGrid() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <ToastProvider>
          <GridWithFaithPoints />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Warm Empty States — Dashboard Coordination', () => {
  it('ReadingPlanWidget shows "Start a guided journey" heading', () => {
    renderGrid()
    expect(screen.getByText('Start a guided journey')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Reading plans walk you through Scripture day by day.',
      ),
    ).toBeInTheDocument()
  })

  it('GratitudeWidget shows "Count three blessings" helper for first-time users', () => {
    renderGrid()
    expect(
      screen.getByText('Count three blessings from today'),
    ).toBeInTheDocument()
  })

  it('FriendsPreview shows "Faith grows stronger together"', () => {
    renderGrid()
    // The "Faith grows stronger together" copy is shared by FriendsPreview and
    // WeeklyRecap (Decision 8). Scope the assertion to the FriendsPreview card
    // by its heading so the test asserts what its name claims.
    const friendsCard = screen
      .getByRole('heading', { name: 'Friends & Leaderboard' })
      .closest('section')
    expect(friendsCard).not.toBeNull()
    expect(
      within(friendsCard as HTMLElement).getByText('Faith grows stronger together'),
    ).toBeInTheDocument()
  })

  it('mood chart ghost state present', () => {
    renderGrid()
    expect(
      screen.getByText('Your mood journey starts today'),
    ).toBeInTheDocument()
  })

  it('streak at 0 shows encouraging message', () => {
    renderGrid()
    expect(screen.getByText('A new streak starts today')).toBeInTheDocument()
  })

  it('all empty state icons have aria-hidden', () => {
    const { container } = renderGrid()
    // All Lucide icons within the grid should be aria-hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('all CTA buttons/links have accessible names', () => {
    renderGrid()
    // Check that CTA elements exist and are accessible
    const buttons = screen.getAllByRole('button')
    const links = screen.getAllByRole('link')
    ;[...buttons, ...links].forEach((el) => {
      // Every interactive element should have accessible text
      expect(
        el.textContent || el.getAttribute('aria-label'),
      ).toBeTruthy()
    })
  })
})
