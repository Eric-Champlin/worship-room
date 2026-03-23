import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { DashboardHero } from '../DashboardHero'

vi.mock('@/hooks/useLiturgicalSeason', () => ({
  useLiturgicalSeason: vi.fn(),
}))

import { useLiturgicalSeason } from '@/hooks/useLiturgicalSeason'
import { LITURGICAL_SEASONS } from '@/constants/liturgical-calendar'

const mockUseLiturgicalSeason = vi.mocked(useLiturgicalSeason)

afterEach(() => {
  vi.restoreAllMocks()
})

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

describe('DashboardHero — seasonal suffix', () => {
  it('renders seasonal suffix during named season (Lent)', () => {
    mockSeason('lent')
    render(<DashboardHero userName="Eric" />)
    expect(screen.getByText(/Blessed Lent/)).toBeInTheDocument()
  })

  it('does not render suffix during Ordinary Time', () => {
    mockSeason('ordinary-time')
    render(<DashboardHero userName="Eric" />)
    expect(screen.queryByText(/Blessed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Merry/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Happy/)).not.toBeInTheDocument()
  })

  it('suffix uses season theme color', () => {
    mockSeason('lent')
    render(<DashboardHero userName="Eric" />)
    const suffix = screen.getByText(/Blessed Lent/)
    expect(suffix).toHaveStyle({ color: '#6B21A8' })
  })

  it('suffix is inside the h1 element', () => {
    mockSeason('advent')
    render(<DashboardHero userName="Eric" />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toBeInTheDocument()
    expect(h1.textContent).toContain('Blessed Advent')
  })

  it('em dash separator is present', () => {
    mockSeason('christmas')
    render(<DashboardHero userName="Eric" />)
    const suffix = screen.getByText(/Merry Christmas/)
    expect(suffix.textContent).toContain(' — ')
  })
})
