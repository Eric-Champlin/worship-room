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
  sessionStorage.clear()
  mockUseReducedMotion.mockReturnValue(false)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SeasonalBanner', () => {
  it('renders during named season', () => {
    mockSeason('lent')
    renderBanner()
    expect(screen.getByText(/It's Lent/)).toBeInTheDocument()
  })

  it('does not render during Ordinary Time', () => {
    mockSeason('ordinary-time')
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('shows season name and theme word', () => {
    mockSeason('lent')
    renderBanner()
    expect(screen.getByText(/It's Lent — a season of renewal/)).toBeInTheDocument()
  })

  it('shows seasonal icon with aria-hidden', () => {
    mockSeason('lent')
    renderBanner()
    const banner = screen.getByRole('complementary')
    const icon = banner.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('CTA links to /devotional', () => {
    mockSeason('advent')
    renderBanner()
    const link = screen.getByText("Read today's devotional")
    expect(link).toHaveAttribute('href', '/daily?tab=devotional')
  })

  it('dismiss button stores to sessionStorage', () => {
    mockSeason('easter')
    mockUseReducedMotion.mockReturnValue(true)
    renderBanner()
    const dismissBtn = screen.getByLabelText('Dismiss seasonal banner')
    fireEvent.click(dismissBtn)
    expect(sessionStorage.getItem('wr_seasonal_banner_dismissed')).toBe('true')
  })

  it('does not render after dismissal', () => {
    sessionStorage.setItem('wr_seasonal_banner_dismissed', 'true')
    mockSeason('christmas')
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
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

  it('no slide animation when prefers-reduced-motion', () => {
    mockSeason('advent')
    mockUseReducedMotion.mockReturnValue(true)
    renderBanner()
    const banner = screen.getByRole('complementary')
    expect(banner.style.transition).toBe('none')
  })
})
