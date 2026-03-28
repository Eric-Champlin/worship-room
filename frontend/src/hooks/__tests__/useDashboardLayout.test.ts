import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDashboardLayout } from '../useDashboardLayout'
import { saveDashboardLayout } from '@/services/dashboard-layout-storage'
import type { DashboardLayout } from '@/types/dashboard'
import type { WidgetId } from '@/constants/dashboard/widget-order'

function mockHour(hour: number) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 2, 28, hour, 0, 0))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDashboardLayout', () => {
  it('returns time-based order when no layout saved', () => {
    mockHour(8) // morning
    const { result } = renderHook(() => useDashboardLayout({}))
    // Morning order starts with getting-started (prepended), then devotional
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
    expect(result.current.orderedWidgets[1]).toBe('devotional')
    expect(result.current.isCustomized).toBe(false)
  })

  it('returns time-based order when customized is false', () => {
    mockHour(8)
    saveDashboardLayout({ order: ['votd'], hidden: [], customized: false })
    const { result } = renderHook(() => useDashboardLayout({}))
    // Should use time-based order, not the saved order
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
    expect(result.current.orderedWidgets[1]).toBe('devotional')
  })

  it('returns user order when customized is true', () => {
    const layout: DashboardLayout = {
      order: ['votd', 'streak', 'mood-chart', 'getting-started'],
      hidden: [],
      customized: true,
    }
    saveDashboardLayout(layout)
    const { result } = renderHook(() => useDashboardLayout({}))
    // getting-started prepended to first position
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
    expect(result.current.orderedWidgets[1]).toBe('votd')
    expect(result.current.orderedWidgets[2]).toBe('streak')
    expect(result.current.isCustomized).toBe(true)
  })

  it('filters hidden widgets', () => {
    saveDashboardLayout({
      order: ['votd', 'streak', 'mood-chart'],
      hidden: ['votd'],
      customized: true,
    })
    const { result } = renderHook(() => useDashboardLayout({}))
    expect(result.current.orderedWidgets).not.toContain('votd')
    expect(result.current.orderedWidgets).toContain('streak')
  })

  it('filters conditionally invisible widgets', () => {
    mockHour(8)
    const visibility: Partial<Record<WidgetId, boolean>> = {
      'reading-plan': false,
    }
    const { result } = renderHook(() => useDashboardLayout(visibility))
    expect(result.current.orderedWidgets).not.toContain('reading-plan')
  })

  it('getting-started appears first when visible', () => {
    mockHour(19) // evening
    const { result } = renderHook(() => useDashboardLayout({}))
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
  })

  it('getting-started not shown when visibility is false', () => {
    mockHour(8)
    const visibility: Partial<Record<WidgetId, boolean>> = {
      'getting-started': false,
    }
    const { result } = renderHook(() => useDashboardLayout(visibility))
    expect(result.current.orderedWidgets).not.toContain('getting-started')
  })

  it('unknown widget IDs in saved layout are dropped', () => {
    saveDashboardLayout({
      order: ['nonexistent' as WidgetId, 'votd'],
      hidden: [],
      customized: true,
    })
    const { result } = renderHook(() => useDashboardLayout({}))
    expect(result.current.orderedWidgets).not.toContain('nonexistent')
    expect(result.current.orderedWidgets).toContain('votd')
  })

  it('resetToDefault clears layout and returns time-based', () => {
    mockHour(8)
    saveDashboardLayout({
      order: ['votd'],
      hidden: ['streak'],
      customized: true,
    })
    const { result } = renderHook(() => useDashboardLayout({}))
    expect(result.current.isCustomized).toBe(true)

    act(() => {
      result.current.resetToDefault()
    })

    expect(result.current.isCustomized).toBe(false)
    expect(result.current.layout).toBeNull()
    // Should now use morning order
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
    expect(result.current.orderedWidgets[1]).toBe('devotional')
  })

  it('updateOrder persists and switches to customized', () => {
    mockHour(8)
    const { result } = renderHook(() => useDashboardLayout({}))

    act(() => {
      result.current.updateOrder(['streak', 'votd', 'mood-chart'])
    })

    expect(result.current.isCustomized).toBe(true)
    // getting-started prepended
    expect(result.current.orderedWidgets[0]).toBe('getting-started')
    expect(result.current.orderedWidgets[1]).toBe('streak')
    expect(result.current.orderedWidgets[2]).toBe('votd')
  })

  it('toggleVisibility hides and shows widgets', () => {
    saveDashboardLayout({
      order: ['votd', 'streak', 'mood-chart'],
      hidden: [],
      customized: true,
    })
    const { result } = renderHook(() => useDashboardLayout({}))

    act(() => {
      result.current.toggleVisibility('votd', false)
    })
    expect(result.current.orderedWidgets).not.toContain('votd')

    act(() => {
      result.current.toggleVisibility('votd', true)
    })
    expect(result.current.orderedWidgets).toContain('votd')
  })
})
