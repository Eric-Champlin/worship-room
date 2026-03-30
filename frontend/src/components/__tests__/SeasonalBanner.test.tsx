import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SeasonalBanner } from '../SeasonalBanner'
import { LITURGICAL_SEASONS } from '@/constants/liturgical-calendar'

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const mockUseLiturgicalSeason = vi.mocked(useLiturgicalSeason)
const mockUseReducedMotion = vi.mocked(useReducedMotion)

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

function renderBanner() {
  return render(
    <MemoryRouter>
      <SeasonalBanner />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SeasonalBanner', () => {
  it('renders during named season', () => {
    mockSeason('lent')
    renderBanner()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('does not render during Ordinary Time', () => {
    mockSeason('ordinary-time')
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('shows custom Advent message', () => {
    mockSeason('advent')
    renderBanner()
    expect(screen.getByText(/waiting and hope/)).toBeInTheDocument()
  })

  it('shows custom Christmas message', () => {
    mockSeason('christmas')
    renderBanner()
    expect(screen.getByText(/gift of Emmanuel/)).toBeInTheDocument()
  })

  it('shows custom Lent message', () => {
    mockSeason('lent')
    renderBanner()
    expect(screen.getByText(/reflection and renewal/)).toBeInTheDocument()
  })

  it('shows custom Holy Week message', () => {
    mockSeason('holy-week')
    renderBanner()
    expect(screen.getByText(/sacrifice and redemption/)).toBeInTheDocument()
  })

  it('shows custom Easter message', () => {
    mockSeason('easter')
    renderBanner()
    expect(screen.getByText(/He is risen!/)).toBeInTheDocument()
  })

  it('shows custom Pentecost message', () => {
    mockSeason('pentecost')
    renderBanner()
    expect(screen.getByText(/the Spirit is moving/)).toBeInTheDocument()
  })

  it('shows fallback message for Epiphany', () => {
    mockSeason('epiphany')
    renderBanner()
    expect(screen.getByText(/It's Epiphany — a season of/)).toBeInTheDocument()
  })

  it('CTA links to /daily?tab=devotional', () => {
    mockSeason('advent')
    renderBanner()
    const link = screen.getByText(/Read today.s devotional/)
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
  })

  it('CTA uses text-primary-lt class', () => {
    mockSeason('advent')
    renderBanner()
    const link = screen.getByText(/Read today.s devotional/)
    expect(link.className).toContain('text-primary-lt')
  })

  it('decorative sparkle icon has aria-hidden', () => {
    mockSeason('lent')
    renderBanner()
    const banner = screen.getByRole('complementary')
    const icon = banner.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('dismiss writes to localStorage with season key', () => {
    mockSeason('lent')
    mockUseReducedMotion.mockReturnValue(true)
    renderBanner()
    const dismissBtn = screen.getByLabelText('Dismiss seasonal banner')
    fireEvent.click(dismissBtn)
    expect(localStorage.getItem('wr_seasonal_banner_dismissed_lent')).toBe('true')
  })

  it('does not render when dismissed', () => {
    localStorage.setItem('wr_seasonal_banner_dismissed_christmas', 'true')
    mockSeason('christmas')
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('new season shows banner after previous season dismissal', () => {
    localStorage.setItem('wr_seasonal_banner_dismissed_lent', 'true')
    mockSeason('easter')
    renderBanner()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('dismiss button has aria-label', () => {
    mockSeason('advent')
    renderBanner()
    expect(screen.getByLabelText('Dismiss seasonal banner')).toBeInTheDocument()
  })

  it('dismiss button has 44px touch target', () => {
    mockSeason('advent')
    renderBanner()
    const btn = screen.getByLabelText('Dismiss seasonal banner')
    expect(btn.className).toContain('h-11')
    expect(btn.className).toContain('w-11')
  })

  it('banner has role="complementary"', () => {
    mockSeason('pentecost')
    renderBanner()
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('banner has aria-label="Seasonal announcement"', () => {
    mockSeason('pentecost')
    renderBanner()
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Seasonal announcement')
  })

  it('no animation when prefers-reduced-motion', () => {
    mockSeason('advent')
    mockUseReducedMotion.mockReturnValue(true)
    renderBanner()
    const banner = screen.getByRole('complementary')
    expect(banner.style.transition).toBe('none')
  })

  it('has glassmorphic background classes', () => {
    mockSeason('lent')
    renderBanner()
    const banner = screen.getByRole('complementary')
    expect(banner.className).toContain('bg-white/[0.04]')
    expect(banner.className).toContain('backdrop-blur-md')
    expect(banner.className).toContain('border-b')
    expect(banner.className).toContain('border-white/10')
  })
})
