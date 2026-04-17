import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PlanMetadata, PlanProgress } from '@/types/bible-plans'
import type { UsePlanBrowserResult } from '@/hooks/bible/usePlanBrowser'

vi.mock('@/hooks/bible/usePlanBrowser')
vi.mock('@/components/Navbar', () => ({
  Navbar: () => null,
}))
vi.mock('@/components/SiteFooter', () => ({
  SiteFooter: () => null,
}))
vi.mock('@/components/daily/HorizonGlow', () => ({
  HorizonGlow: () => null,
}))
vi.mock('@/components/SEO', () => ({
  SEO: ({ title }: { title: string }) => { document.title = title; return null },
}))

import { usePlanBrowser } from '@/hooks/bible/usePlanBrowser'
import { PlanBrowserPage } from '../PlanBrowserPage'

const mockUsePlanBrowser = usePlanBrowser as ReturnType<typeof vi.fn>

const COMFORT_PLAN: PlanMetadata = {
  slug: 'comfort-7',
  title: 'Finding Comfort',
  shortTitle: 'Comfort',
  description: 'A comfort plan',
  theme: 'comfort',
  duration: 7,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-primary/30 to-hero-dark',
}

const PRAYER_PLAN: PlanMetadata = {
  slug: 'prayer-21',
  title: 'Prayer Journey',
  shortTitle: 'Prayer',
  description: 'A prayer plan',
  theme: 'prayer',
  duration: 21,
  estimatedMinutesPerDay: 15,
  curator: 'Worship Room',
  coverGradient: 'from-blue-500/30 to-hero-dark',
}

function makeProgress(slug: string, overrides: Partial<PlanProgress> = {}): PlanProgress {
  return {
    slug,
    startedAt: '2026-01-01',
    currentDay: 1,
    completedDays: [],
    completedAt: null,
    pausedAt: null,
    resumeFromDay: null,
    reflection: null,
    celebrationShown: false,
    ...overrides,
  }
}

function defaultResult(overrides: Partial<UsePlanBrowserResult> = {}): UsePlanBrowserResult {
  return {
    sections: { inProgress: [], browse: [COMFORT_PLAN, PRAYER_PLAN], completed: [] },
    filteredBrowse: [COMFORT_PLAN, PRAYER_PLAN],
    theme: 'all',
    duration: 'any',
    setTheme: vi.fn(),
    setDuration: vi.fn(),
    clearFilters: vi.fn(),
    isEmpty: false,
    isFilteredEmpty: false,
    isAllStarted: false,
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bible/plans']}>
      <PlanBrowserPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUsePlanBrowser.mockReturnValue(defaultResult())
})

describe('PlanBrowserPage', () => {
  it('renders page title "Reading Plans"', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /Reading Plans/i })).toBeInTheDocument()
  })

  it('renders SEO meta', () => {
    renderPage()
    expect(document.title).toContain('Reading Plans')
  })

  it('shows empty state when manifest is empty', () => {
    mockUsePlanBrowser.mockReturnValue(
      defaultResult({
        isEmpty: true,
        sections: { inProgress: [], browse: [], completed: [] },
        filteredBrowse: [],
      }),
    )
    renderPage()
    expect(screen.getByText('No plans available yet')).toBeInTheDocument()
  })

  it('does not render filter bar (BB-51 removed)', () => {
    renderPage()
    expect(screen.queryByRole('navigation', { name: /filters/i })).not.toBeInTheDocument()
    // "Any length" was a filter pill label — should be gone
    expect(screen.queryByText('Any length')).not.toBeInTheDocument()
  })

  it('heading uses gradient and includes pb-2 to prevent descender clip', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1, name: /Reading Plans/i })
    expect(heading.className).toContain('pb-2')
    expect(heading.style.backgroundClip).toBeTruthy()
  })

  it('shows In Progress section when plans are active', () => {
    const progress = makeProgress('comfort-7', { currentDay: 3, completedDays: [1, 2] })
    mockUsePlanBrowser.mockReturnValue(
      defaultResult({
        sections: {
          inProgress: [{ plan: COMFORT_PLAN, progress }],
          browse: [PRAYER_PLAN],
          completed: [],
        },
        filteredBrowse: [PRAYER_PLAN],
      }),
    )
    renderPage()
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('hides In Progress section when no active plans', () => {
    renderPage()
    expect(screen.queryByText('In progress')).not.toBeInTheDocument()
  })

  it('shows Browse Plans section with cards', () => {
    renderPage()
    expect(screen.getByText('Browse plans')).toBeInTheDocument()
    expect(screen.getByText('Finding Comfort')).toBeInTheDocument()
    expect(screen.getByText('Prayer Journey')).toBeInTheDocument()
  })

  it('shows Completed section when plans are done', () => {
    const progress = makeProgress('comfort-7', {
      completedAt: '2026-01-07',
      completedDays: [1, 2, 3, 4, 5, 6, 7],
    })
    mockUsePlanBrowser.mockReturnValue(
      defaultResult({
        sections: {
          inProgress: [],
          browse: [PRAYER_PLAN],
          completed: [{ plan: COMFORT_PLAN, progress }],
        },
        filteredBrowse: [PRAYER_PLAN],
      }),
    )
    renderPage()
    expect(screen.getByRole('heading', { level: 2, name: /Completed/i })).toBeInTheDocument()
  })

  it('filtered empty state shows clear button', () => {
    const clearFilters = vi.fn()
    mockUsePlanBrowser.mockReturnValue(
      defaultResult({
        isFilteredEmpty: true,
        filteredBrowse: [],
        clearFilters,
      }),
    )
    renderPage()
    expect(screen.getByText('No plans match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear filters/i })).toBeInTheDocument()
  })

  it('hook-provided filteredBrowse still drives card display (even with filter UI removed)', () => {
    mockUsePlanBrowser.mockReturnValue(
      defaultResult({
        theme: 'comfort',
        filteredBrowse: [COMFORT_PLAN],
      }),
    )
    renderPage()
    // Only the comfort plan should be rendered (not prayer)
    expect(screen.getByText('Finding Comfort')).toBeInTheDocument()
    expect(screen.queryByText('Prayer Journey')).not.toBeInTheDocument()
  })

  it('hero heading uses Daily Hub pt-36/sm:pt-40/lg:pt-44 padding', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1, name: /Reading Plans/i })
    const section = heading.closest('section')
    expect(section?.className).toContain('pt-36')
    expect(section?.className).toContain('sm:pt-40')
    expect(section?.className).toContain('lg:pt-44')
  })

  it('no ATMOSPHERIC_HERO_BG inline background (no #0f0a1e)', () => {
    const { container } = renderPage()
    const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')
    expect(darkBgElements.length).toBe(0)
  })
})
