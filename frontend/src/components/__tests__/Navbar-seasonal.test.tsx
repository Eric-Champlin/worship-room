import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
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

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
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

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderNavbar() {
  const { Navbar } = await import('../Navbar')
  return render(
    <MemoryRouter>
      <Navbar transparent />
    </MemoryRouter>,
  )
}

describe('Navbar — clean logo', () => {
  it('renders logo text without seasonal icon during named season', async () => {
    mockSeason('advent')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    const icons = homeLink.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons).toHaveLength(0)
  })

  it('renders logo text without seasonal icon during Ordinary Time', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    const icons = homeLink.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons).toHaveLength(0)
  })

  it('logo text says "Worship Room"', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    const homeLink = screen.getByLabelText('Worship Room home')
    expect(homeLink).toHaveTextContent('Worship Room')
  })
})

describe('Navbar — SeasonalBanner integration', () => {
  it('renders SeasonalBanner during named season', async () => {
    mockSeason('lent')
    await renderNavbar()
    expect(screen.getByRole('complementary', { name: 'Seasonal announcement' })).toBeInTheDocument()
  })

  it('does not render SeasonalBanner during Ordinary Time', async () => {
    mockSeason('ordinary-time')
    await renderNavbar()
    expect(screen.queryByRole('complementary', { name: 'Seasonal announcement' })).not.toBeInTheDocument()
  })

  it('renders SeasonalBanner inside the nav element', async () => {
    mockSeason('advent')
    await renderNavbar()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const banner = screen.getByRole('complementary', { name: 'Seasonal announcement' })
    expect(nav.contains(banner)).toBe(true)
  })

  it('suppresses SeasonalBanner when hideBanner is true', async () => {
    mockSeason('lent')
    const { Navbar } = await import('../Navbar')
    render(
      <MemoryRouter>
        <Navbar transparent hideBanner />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('complementary', { name: 'Seasonal announcement' })).not.toBeInTheDocument()
  })
})
