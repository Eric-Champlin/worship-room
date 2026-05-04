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
vi.mock('@/components/ui/BackgroundCanvas', () => ({
  BackgroundCanvas: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="background-canvas" className={className}>
      {children}
    </div>
  ),
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

  it('hero heading uses pt-30/sm:pt-34/lg:pt-36 padding (Bible browser scale)', () => {
    renderPage()
    const heading = screen.getByRole('heading', { level: 1, name: /Reading Plans/i })
    const section = heading.closest('section')
    expect(section?.className).toContain('pt-30')
    expect(section?.className).toContain('sm:pt-34')
    expect(section?.className).toContain('lg:pt-36')
  })

  it('no ATMOSPHERIC_HERO_BG inline background (no #0f0a1e)', () => {
    const { container } = renderPage()
    const darkBgElements = container.querySelectorAll('[style*="0f0a1e"]')
    expect(darkBgElements.length).toBe(0)
  })

  it('wraps page in BackgroundCanvas (multi-bloom atmospheric layer)', () => {
    renderPage()
    const canvas = screen.getByTestId('background-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas.className).toContain('flex')
    expect(canvas.className).toContain('flex-col')
    expect(canvas.className).toContain('font-sans')
  })

  it('hero pb classes tightened (pb-3 sm:pb-4)', () => {
    const { container } = renderPage()
    const hero = container.querySelector('section.pt-30')
    expect(hero?.className).toContain('pb-3')
    expect(hero?.className).toContain('sm:pb-4')
    // Old values should not be present
    expect(hero?.className).not.toContain('pb-10')
    expect(hero?.className).not.toContain('sm:pb-12')
  })

  it('border-t divider removed from main', () => {
    const { container } = renderPage()
    const main = container.querySelector('main#main-content')
    // Look for the specific divider class combo that used to live here
    const divider = main?.querySelector(':scope > div.border-t.border-white\\/\\[0\\.08\\]')
    expect(divider).toBeNull()
  })

  it('content wrapper py classes tightened (py-4 sm:py-6)', () => {
    const { container } = renderPage()
    const main = container.querySelector('main#main-content')
    // The content wrapper is the immediate div child after the hero <section>
    const contentWrapper = main?.querySelector(':scope > div.max-w-6xl.px-4')
    expect(contentWrapper?.className).toContain('py-4')
    expect(contentWrapper?.className).toContain('sm:py-6')
    expect(contentWrapper?.className).not.toContain('py-8')
    expect(contentWrapper?.className).not.toContain('sm:py-12')
  })

  it('Browse Plans section as first child has first:mt-2 alongside mt-12', () => {
    // Default scenario: no in-progress, Browse Plans is first rendered section
    const { container } = renderPage()
    const sections = container.querySelectorAll('main#main-content section')
    // sections[0] is the hero <section>, sections[1] is the first PlanBrowserSection
    const firstPlanSection = sections[1]
    expect(firstPlanSection.className).toContain('first:mt-2')
    expect(firstPlanSection.className).toContain('mt-12')
  })

  it('In Progress section as first child has first:mt-2; Browse Plans second has mt-12 only', () => {
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
    const { container } = renderPage()
    const sections = container.querySelectorAll('main#main-content section')
    // sections[0] hero, sections[1] In Progress (first), sections[2] Browse Plans
    const inProgressSection = sections[1]
    const browseSection = sections[2]
    expect(inProgressSection.className).toContain('first:mt-2')
    expect(inProgressSection.className).toContain('mt-8')
    expect(browseSection.className).toContain('first:mt-2')
    expect(browseSection.className).toContain('mt-12')
    // first: variant is no-op when not first child; mt-12 governs the between-sections rhythm
  })
})
