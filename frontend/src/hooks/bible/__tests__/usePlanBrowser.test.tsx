import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import type { PlanMetadata, PlanProgress, PlansStoreState } from '@/types/bible-plans'

vi.mock('@/lib/bible/plansStore', () => ({
  getPlansState: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('@/hooks/bible/usePlansManifest', () => ({
  usePlansManifest: vi.fn(),
}))

import { getPlansState, subscribe } from '@/lib/bible/plansStore'
import { usePlansManifest } from '@/hooks/bible/usePlansManifest'
import { usePlanBrowser } from '../usePlanBrowser'

const mockGetPlansState = getPlansState as ReturnType<typeof vi.fn>
const mockSubscribe = subscribe as ReturnType<typeof vi.fn>
const mockUsePlansManifest = usePlansManifest as ReturnType<typeof vi.fn>

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

const WISDOM_PLAN: PlanMetadata = {
  slug: 'wisdom-5',
  title: 'Wisdom Basics',
  shortTitle: 'Wisdom',
  description: 'A wisdom plan',
  theme: 'wisdom',
  duration: 5,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-yellow-500/30 to-hero-dark',
}

const ALL_PLANS = [COMFORT_PLAN, PRAYER_PLAN, WISDOM_PLAN]

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

function wrapper(initialEntries: string[] = ['/bible/plans']) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSubscribe.mockReturnValue(() => {})
  mockGetPlansState.mockReturnValue({ activePlanSlug: null, plans: {} } as PlansStoreState)
  mockUsePlansManifest.mockReturnValue({ plans: ALL_PLANS, isLoading: false })
})

describe('usePlanBrowser', () => {
  it('returns empty sections when manifest is empty', () => {
    mockUsePlansManifest.mockReturnValue({ plans: [], isLoading: false })
    const { result } = renderHook(() => usePlanBrowser(), { wrapper: wrapper() })
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.sections.inProgress).toHaveLength(0)
    expect(result.current.sections.browse).toHaveLength(0)
    expect(result.current.sections.completed).toHaveLength(0)
  })

  it('splits plans into correct sections', () => {
    const progress = makeProgress('comfort-7', { currentDay: 3, completedDays: [1, 2] })
    mockGetPlansState.mockReturnValue({
      activePlanSlug: 'comfort-7',
      plans: { 'comfort-7': progress },
    })

    const { result } = renderHook(() => usePlanBrowser(), { wrapper: wrapper() })
    expect(result.current.sections.inProgress).toHaveLength(1)
    expect(result.current.sections.inProgress[0].plan.slug).toBe('comfort-7')
    expect(result.current.sections.browse).toHaveLength(2)
  })

  it('applies theme filter to browse section', () => {
    const { result } = renderHook(() => usePlanBrowser(), {
      wrapper: wrapper(['/bible/plans?theme=comfort']),
    })
    expect(result.current.theme).toBe('comfort')
    expect(result.current.filteredBrowse).toHaveLength(1)
    expect(result.current.filteredBrowse[0].slug).toBe('comfort-7')
  })

  it('applies duration filter to browse section', () => {
    const { result } = renderHook(() => usePlanBrowser(), {
      wrapper: wrapper(['/bible/plans?duration=short']),
    })
    expect(result.current.duration).toBe('short')
    expect(result.current.filteredBrowse).toHaveLength(2) // comfort-7 (7 days) + wisdom-5 (5 days)
  })

  it('filters do not affect in-progress or completed sections', () => {
    const progress = makeProgress('prayer-21', { currentDay: 5, completedDays: [1, 2, 3, 4] })
    mockGetPlansState.mockReturnValue({
      activePlanSlug: 'prayer-21',
      plans: { 'prayer-21': progress },
    })

    const { result } = renderHook(() => usePlanBrowser(), {
      wrapper: wrapper(['/bible/plans?theme=comfort']),
    })
    // Prayer plan is in progress — should still be visible even though theme=comfort
    expect(result.current.sections.inProgress).toHaveLength(1)
    expect(result.current.sections.inProgress[0].plan.slug).toBe('prayer-21')
  })

  it('clearFilters resets to defaults', () => {
    const { result } = renderHook(() => usePlanBrowser(), {
      wrapper: wrapper(['/bible/plans?theme=comfort&duration=short']),
    })
    expect(result.current.theme).toBe('comfort')

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.theme).toBe('all')
    expect(result.current.duration).toBe('any')
    expect(result.current.filteredBrowse).toHaveLength(3)
  })

  it('isFilteredEmpty is true when filters exclude all browse plans', () => {
    const { result } = renderHook(() => usePlanBrowser(), {
      wrapper: wrapper(['/bible/plans?theme=foundation']),
    })
    expect(result.current.isFilteredEmpty).toBe(true)
    expect(result.current.filteredBrowse).toHaveLength(0)
  })

  it('isAllStarted is true when all plans are started', () => {
    const plans: Record<string, PlanProgress> = {
      'comfort-7': makeProgress('comfort-7', { currentDay: 2, completedDays: [1] }),
      'prayer-21': makeProgress('prayer-21', { currentDay: 1 }),
      'wisdom-5': makeProgress('wisdom-5', { currentDay: 1 }),
    }
    mockGetPlansState.mockReturnValue({ activePlanSlug: 'comfort-7', plans })

    const { result } = renderHook(() => usePlanBrowser(), { wrapper: wrapper() })
    expect(result.current.isAllStarted).toBe(true)
    expect(result.current.sections.browse).toHaveLength(0)
  })

  it('reacts to plansStore changes via subscribe', () => {
    let storeListener: (() => void) | null = null
    mockSubscribe.mockImplementation((listener: () => void) => {
      storeListener = listener
      return () => { storeListener = null }
    })

    // Initially no progress
    mockGetPlansState.mockReturnValue({ activePlanSlug: null, plans: {} })

    const { result } = renderHook(() => usePlanBrowser(), { wrapper: wrapper() })
    expect(result.current.sections.browse).toHaveLength(3)
    expect(result.current.sections.inProgress).toHaveLength(0)

    // Simulate starting a plan
    const progress = makeProgress('comfort-7')
    mockGetPlansState.mockReturnValue({
      activePlanSlug: 'comfort-7',
      plans: { 'comfort-7': progress },
    })

    act(() => {
      storeListener?.()
    })

    expect(result.current.sections.inProgress).toHaveLength(1)
    expect(result.current.sections.browse).toHaveLength(2)
  })
})
