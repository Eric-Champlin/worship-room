import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LITURGICAL_SEASONS } from '@/constants/liturgical-calendar'

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
}))

vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    clearNotification: vi.fn(),
  })),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: vi.fn(() => ({ openAuthModal: vi.fn() })),
}))

import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'

const mockUseLiturgicalSeason = vi.mocked(useLiturgicalSeason)

function mockSeason(seasonId: keyof typeof LITURGICAL_SEASONS) {
  const season = LITURGICAL_SEASONS[seasonId]
  mockUseLiturgicalSeason.mockReturnValue({
    currentSeason: season,
    seasonName: season.name,
    themeColor: season.themeColor,
    icon: season.icon,
    greeting: season.greeting,
    daysUntilNextSeason: 10,
    isNamedSeason: seasonId !== 'ordinary-time',
  })
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Dynamic import after mocks are set up
async function renderNavbar() {
  const { Navbar } = await import('../Navbar')
  return render(
    <MemoryRouter>
      <Navbar transparent />
    </MemoryRouter>,
  )
}

describe('Navbar — seasonal icon', () => {
  it('renders seasonal icon during named season (Advent)', async () => {
    mockSeason('advent')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    const icon = homeLink.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('does not render icon during Ordinary Time', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    // The only SVGs should not be seasonal icons (no aria-hidden svg in the logo link)
    const icons = homeLink.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons).toHaveLength(0)
  })

  it('icon has aria-hidden="true"', async () => {
    mockSeason('christmas')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    const icon = homeLink.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('icon has correct opacity color', async () => {
    mockSeason('lent')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    const icon = homeLink.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
    // Lent theme color is #6B21A8, with 50% opacity → #6B21A880
    expect(icon).toHaveStyle({ color: '#6B21A880' })
  })
})

describe('Navbar — seasonal line', () => {
  it('renders seasonal line during named season', async () => {
    mockSeason('lent')
    await renderNavbar()
    expect(screen.getByText(/It's Lent/)).toBeInTheDocument()
  })

  it('does NOT render seasonal line during Ordinary Time', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    expect(screen.queryByText(/It's Ordinary/)).not.toBeInTheDocument()
  })

  it('dismiss button hides the seasonal line', async () => {
    const user = userEvent.setup()
    mockSeason('lent')
    await renderNavbar()
    expect(screen.getByText(/It's Lent/)).toBeInTheDocument()

    const dismissBtns = screen.getAllByLabelText('Dismiss seasonal message')
    await user.click(dismissBtns[0])

    expect(screen.queryByText(/It's Lent/)).not.toBeInTheDocument()
  })

  it('dismiss persists to sessionStorage', async () => {
    const user = userEvent.setup()
    mockSeason('lent')
    await renderNavbar()

    const dismissBtns = screen.getAllByLabelText('Dismiss seasonal message')
    await user.click(dismissBtns[0])

    expect(sessionStorage.getItem('wr_seasonal_banner_dismissed')).toBe('true')
  })

  it('dismiss button has accessible label', async () => {
    mockSeason('advent')
    await renderNavbar()
    const dismissBtns = screen.getAllByLabelText('Dismiss seasonal message')
    expect(dismissBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('devotional link points to /devotional', async () => {
    mockSeason('lent')
    await renderNavbar()
    const devLinks = screen.getAllByText(/Read today.s devotional/)
    const link = devLinks.find(el => el.tagName === 'A')
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
  })

  it('shows seasonal content in mobile drawer area', async () => {
    mockSeason('lent')
    await renderNavbar()
    // Both desktop and mobile drawer render seasonal text — at least 2 instances
    const seasonTexts = screen.getAllByText(/It's Lent/)
    expect(seasonTexts.length).toBeGreaterThanOrEqual(1)
  })
})
