import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/bible/planLoader', () => ({
  loadPlan: vi.fn(),
}))

vi.mock('@/lib/bible/plansStore', () => ({
  getPlanProgress: vi.fn(),
  subscribe: vi.fn(),
}))

import { loadPlan } from '@/lib/bible/planLoader'
import { getPlanProgress, subscribe } from '@/lib/bible/plansStore'
import { usePlan } from '../usePlan'

const mockLoadPlan = loadPlan as ReturnType<typeof vi.fn>
const mockGetPlanProgress = getPlanProgress as ReturnType<typeof vi.fn>
const mockSubscribe = subscribe as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockSubscribe.mockReturnValue(() => {})
  mockGetPlanProgress.mockReturnValue(null)
})

describe('usePlan', () => {
  it('loads plan by slug', async () => {
    const mockPlan = { slug: 'psalm-comfort', title: 'Psalms of Comfort', duration: 7, days: [] }
    mockLoadPlan.mockResolvedValue({ plan: mockPlan, error: null })

    const { result } = renderHook(() => usePlan('psalm-comfort'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.plan).toEqual(mockPlan)
    expect(result.current.isError).toBe(false)
    expect(mockLoadPlan).toHaveBeenCalledWith('psalm-comfort')
  })

  it('returns error for invalid slug', async () => {
    mockLoadPlan.mockResolvedValue({ plan: null, error: 'Plan "bad" could not be loaded.' })

    const { result } = renderHook(() => usePlan('bad'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.plan).toBeNull()
    expect(result.current.isError).toBe(true)
  })

  it('subscribes to progress updates', () => {
    mockLoadPlan.mockResolvedValue({ plan: null, error: null })
    renderHook(() => usePlan('test'))

    expect(mockSubscribe).toHaveBeenCalled()
  })
})
