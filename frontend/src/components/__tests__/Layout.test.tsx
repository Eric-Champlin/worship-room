import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'
import { LITURGICAL_SEASONS } from '@/constants/liturgical-calendar'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false })),
}))

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: vi.fn(() => ({ openAuthModal: vi.fn() })),
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

function renderLayout(props?: { dark?: boolean; hero?: React.ReactNode }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout dark={props?.dark} hero={props?.hero}>
        <div>test content</div>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('renders with bg-neutral-bg by default', () => {
    mockSeason('ordinary-time')
    const { container } = renderLayout()
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-neutral-bg')
    expect(outer.className).not.toContain('bg-dashboard-dark')
  })

  it('renders with bg-dashboard-dark when dark prop is true', () => {
    mockSeason('ordinary-time')
    const { container } = renderLayout({ dark: true })
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('bg-dashboard-dark')
    expect(outer.className).not.toContain('bg-neutral-bg')
  })

  it('renders SeasonalBanner during named season', () => {
    mockSeason('lent')
    renderLayout()
    expect(screen.getByRole('complementary', { name: 'Seasonal announcement' })).toBeInTheDocument()
  })

  it('renders SeasonalBanner before main content', () => {
    mockSeason('lent')
    renderLayout()
    const banner = screen.getByRole('complementary')
    const main = screen.getByRole('main')
    // banner should come before main in DOM order
    expect(banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders SeasonalBanner when hero prop is provided', () => {
    mockSeason('advent')
    renderLayout({ hero: <div>hero content</div> })
    expect(screen.getByRole('complementary', { name: 'Seasonal announcement' })).toBeInTheDocument()
  })
})
