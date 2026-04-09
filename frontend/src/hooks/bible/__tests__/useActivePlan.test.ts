import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bible/plansStore', () => ({
  getPlansState: vi.fn(),
  getActivePlanProgress: vi.fn(),
  markDayComplete: vi.fn(),
  pausePlan: vi.fn(),
  startPlan: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('@/lib/bible/planLoader', () => ({
  loadPlan: vi.fn(),
}))

import { loadPlan } from '@/lib/bible/planLoader'
import {
  getActivePlanProgress,
  getPlansState,
  markDayComplete as storeMarkDayComplete,
  subscribe,
} from '@/lib/bible/plansStore'
import { useActivePlan } from '../useActivePlan'

const mockGetPlansState = getPlansState as ReturnType<typeof vi.fn>
const mockGetActivePlanProgress = getActivePlanProgress as ReturnType<typeof vi.fn>
const mockLoadPlan = loadPlan as ReturnType<typeof vi.fn>
const mockSubscribe = subscribe as ReturnType<typeof vi.fn>
const mockStoreMarkDayComplete = storeMarkDayComplete as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockSubscribe.mockReturnValue(() => {})
  mockGetPlansState.mockReturnValue({ activePlanSlug: null, plans: {} })
  mockGetActivePlanProgress.mockReturnValue(null)
  mockLoadPlan.mockResolvedValue({ plan: null, error: null })
})

describe('useActivePlan', () => {
  it('returns null when no active plan', () => {
    const { result } = renderHook(() => useActivePlan())
    expect(result.current.activePlan).toBeNull()
    expect(result.current.progress).toBeNull()
    expect(result.current.currentDay).toBeNull()
  })

  it('loads plan JSON when active plan exists', async () => {
    const mockPlan = {
      slug: 'test',
      title: 'Test Plan',
      duration: 7,
      days: [{ day: 1, title: 'Day One', passages: [{ book: 'john', chapter: 3 }] }],
    }
    const mockProgress = {
      slug: 'test',
      currentDay: 1,
      completedDays: [],
      startedAt: '2026-04-01',
    }

    mockGetPlansState.mockReturnValue({ activePlanSlug: 'test', plans: { test: mockProgress } })
    mockGetActivePlanProgress.mockReturnValue(mockProgress)
    mockLoadPlan.mockResolvedValue({ plan: mockPlan, error: null })

    const { result } = renderHook(() => useActivePlan())

    await waitFor(() => {
      expect(result.current.activePlan).toEqual(mockPlan)
    })
    expect(mockLoadPlan).toHaveBeenCalledWith('test')
  })

  it('isOnPlanPassage checks current day only', async () => {
    const mockPlan = {
      slug: 'test',
      title: 'Test Plan',
      duration: 3,
      days: [
        { day: 1, title: 'Day 1', passages: [{ book: 'john', chapter: 3 }] },
        { day: 2, title: 'Day 2', passages: [{ book: 'john', chapter: 4 }] },
        { day: 3, title: 'Day 3', passages: [{ book: 'john', chapter: 5 }] },
      ],
    }
    const mockProgress = {
      slug: 'test',
      currentDay: 1,
      completedDays: [],
      startedAt: '2026-04-01',
    }

    mockGetPlansState.mockReturnValue({ activePlanSlug: 'test', plans: { test: mockProgress } })
    mockGetActivePlanProgress.mockReturnValue(mockProgress)
    mockLoadPlan.mockResolvedValue({ plan: mockPlan, error: null })

    const { result } = renderHook(() => useActivePlan())

    await waitFor(() => {
      expect(result.current.activePlan).toEqual(mockPlan)
    })

    expect(result.current.isOnPlanPassage('john', 3)).toBe(true)
    expect(result.current.isOnPlanPassage('john', 4)).toBe(false) // day 2, not current
  })

  it('markDayComplete delegates to store', async () => {
    const mockPlan = {
      slug: 'test',
      title: 'Test Plan',
      duration: 3,
      days: [{ day: 1, title: 'Day 1', passages: [] }],
    }
    const mockProgress = {
      slug: 'test',
      currentDay: 1,
      completedDays: [],
      startedAt: '2026-04-01',
    }

    mockGetPlansState.mockReturnValue({ activePlanSlug: 'test', plans: { test: mockProgress } })
    mockGetActivePlanProgress.mockReturnValue(mockProgress)
    mockLoadPlan.mockResolvedValue({ plan: mockPlan, error: null })
    mockStoreMarkDayComplete.mockReturnValue({ type: 'day-completed', day: 1, isAllComplete: false })

    const { result } = renderHook(() => useActivePlan())

    await waitFor(() => {
      expect(result.current.activePlan).toEqual(mockPlan)
    })

    const completionResult = result.current.markDayComplete(1)
    expect(mockStoreMarkDayComplete).toHaveBeenCalledWith('test', 1, 3)
    expect(completionResult.type).toBe('day-completed')
  })
})
