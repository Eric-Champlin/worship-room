import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ActivityItem } from '@/types/my-bible'

// Shared state accessible from hoisted vi.mock factories
const shared = {
  highlightListeners: new Set<() => void>(),
  bookmarkListeners: new Set<() => void>(),
  noteListeners: new Set<() => void>(),
}

vi.mock('@/lib/bible/highlightStore', () => ({
  subscribe: vi.fn((fn: () => void) => {
    shared.highlightListeners.add(fn)
    return () => shared.highlightListeners.delete(fn)
  }),
}))

vi.mock('@/lib/bible/bookmarkStore', () => ({
  subscribe: vi.fn((fn: () => void) => {
    shared.bookmarkListeners.add(fn)
    return () => shared.bookmarkListeners.delete(fn)
  }),
}))

vi.mock('@/lib/bible/notes/store', () => ({
  subscribe: vi.fn((fn: () => void) => {
    shared.noteListeners.add(fn)
    return () => shared.noteListeners.delete(fn)
  }),
}))

const mockLoadAllActivity = vi.fn<() => ActivityItem[]>(() => [])
vi.mock('@/lib/bible/activityLoader', () => ({
  loadAllActivity: (...args: unknown[]) => mockLoadAllActivity(...(args as [])),
  filterActivity: vi.fn((items: ActivityItem[], filter) => {
    if (filter.type === 'all' && filter.book === 'all') return items
    return items.filter((item) => {
      if (filter.type !== 'all') {
        const typeMap: Record<string, string> = {
          highlights: 'highlight',
          notes: 'note',
          bookmarks: 'bookmark',
          'daily-hub': 'meditation',
        }
        if (item.type !== typeMap[filter.type]) return false
      }
      if (filter.book !== 'all' && item.book !== filter.book) return false
      return true
    })
  }),
  sortActivity: vi.fn((items: ActivityItem[], sort) => {
    const sorted = [...items]
    if (sort === 'recent') {
      sorted.sort((a, b) => Math.max(b.createdAt, b.updatedAt) - Math.max(a.createdAt, a.updatedAt))
    }
    return sorted
  }),
}))

vi.mock('@/lib/bible/landingState', () => ({
  getBibleStreak: vi.fn(() => null),
}))

vi.mock('@/data/bible/index', () => ({
  loadChapterWeb: vi.fn(() => Promise.resolve(null)),
}))

import { useActivityFeed } from '../useActivityFeed'

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    type: 'highlight',
    id: 'hl-1',
    createdAt: 1000,
    updatedAt: 1000,
    book: 'john',
    bookName: 'John',
    chapter: 3,
    startVerse: 16,
    endVerse: 16,
    data: { type: 'highlight', color: 'joy' },
    ...overrides,
  }
}

describe('useActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadAllActivity.mockReturnValue([])
    shared.highlightListeners.clear()
    shared.bookmarkListeners.clear()
    shared.noteListeners.clear()
  })

  it('returns items from all stores on mount', () => {
    const items = [
      makeItem({ id: '1' }),
      makeItem({ id: '2', type: 'bookmark', data: { type: 'bookmark' } }),
    ]
    mockLoadAllActivity.mockReturnValue(items)

    const { result } = renderHook(() => useActivityFeed())
    expect(result.current.items).toHaveLength(2)
  })

  it('re-loads when highlight store changes', () => {
    mockLoadAllActivity.mockReturnValue([])
    const { result } = renderHook(() => useActivityFeed())
    expect(result.current.items).toHaveLength(0)

    mockLoadAllActivity.mockReturnValue([makeItem()])
    act(() => {
      shared.highlightListeners.forEach((fn) => fn())
    })
    expect(result.current.items).toHaveLength(1)
  })

  it('re-loads when bookmark store changes', () => {
    mockLoadAllActivity.mockReturnValue([])
    const { result } = renderHook(() => useActivityFeed())

    mockLoadAllActivity.mockReturnValue([makeItem({ type: 'bookmark', data: { type: 'bookmark' } })])
    act(() => {
      shared.bookmarkListeners.forEach((fn) => fn())
    })
    expect(result.current.items).toHaveLength(1)
  })

  it('re-loads when note store changes', () => {
    mockLoadAllActivity.mockReturnValue([])
    const { result } = renderHook(() => useActivityFeed())

    mockLoadAllActivity.mockReturnValue([makeItem({ type: 'note', data: { type: 'note', body: 'text' } })])
    act(() => {
      shared.noteListeners.forEach((fn) => fn())
    })
    expect(result.current.items).toHaveLength(1)
  })

  it('applies type filter', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1' }),
      makeItem({ id: '2', type: 'bookmark', data: { type: 'bookmark' } }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    act(() => {
      result.current.setFilter({ type: 'highlights', book: 'all', color: 'all' })
    })
    expect(result.current.items.every((i) => i.type === 'highlight')).toBe(true)
  })

  it('applies book filter', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1', book: 'john' }),
      makeItem({ id: '2', book: 'genesis' }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    act(() => {
      result.current.setFilter({ type: 'all', book: 'john', color: 'all' })
    })
    expect(result.current.items.every((i) => i.book === 'john')).toBe(true)
  })

  it('applies sort=recent', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1', createdAt: 1000, updatedAt: 1000 }),
      makeItem({ id: '2', createdAt: 3000, updatedAt: 3000 }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    expect(result.current.items[0].id).toBe('2')
  })

  it('applies sort=canonical', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1', createdAt: 1000, updatedAt: 1000 }),
      makeItem({ id: '2', createdAt: 3000, updatedAt: 3000 }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    act(() => {
      result.current.setSort('canonical')
    })
    expect(result.current.items).toHaveLength(2)
  })

  it('computes totalCounts correctly', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1', type: 'highlight', data: { type: 'highlight', color: 'joy' } }),
      makeItem({ id: '2', type: 'highlight', data: { type: 'highlight', color: 'peace' } }),
      makeItem({ id: '3', type: 'note', data: { type: 'note', body: 'text' } }),
      makeItem({ id: '4', type: 'bookmark', book: 'genesis', data: { type: 'bookmark' } }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    expect(result.current.totalCounts.highlights).toBe(2)
    expect(result.current.totalCounts.notes).toBe(1)
    expect(result.current.totalCounts.bookmarks).toBe(1)
    expect(result.current.totalCounts.booksSet.size).toBe(2)
  })

  it('computes bookCounts from all items (unfiltered)', () => {
    mockLoadAllActivity.mockReturnValue([
      makeItem({ id: '1', book: 'john' }),
      makeItem({ id: '2', book: 'john' }),
      makeItem({ id: '3', book: 'genesis', type: 'note', data: { type: 'note', body: 'text' } }),
    ])

    const { result } = renderHook(() => useActivityFeed())
    // Verify counts include all books
    expect(result.current.bookCounts.get('john')).toBe(2)
    expect(result.current.bookCounts.get('genesis')).toBe(1)

    // Filter by type=highlights — bookCounts should NOT change (independent filter)
    act(() => {
      result.current.setFilter({ type: 'highlights', book: 'all', color: 'all' })
    })
    expect(result.current.bookCounts.get('john')).toBe(2)
    expect(result.current.bookCounts.get('genesis')).toBe(1)
  })

  it('returns isEmpty=true when no items', () => {
    mockLoadAllActivity.mockReturnValue([])
    const { result } = renderHook(() => useActivityFeed())
    expect(result.current.isEmpty).toBe(true)
  })

  it('returns isFilteredEmpty when filter matches zero', () => {
    mockLoadAllActivity.mockReturnValue([makeItem()])
    const { result } = renderHook(() => useActivityFeed())

    act(() => {
      result.current.setFilter({ type: 'notes', book: 'all', color: 'all' })
    })
    expect(result.current.isFilteredEmpty).toBe(true)
  })

  it('clearFilters resets to defaults', () => {
    mockLoadAllActivity.mockReturnValue([makeItem()])
    const { result } = renderHook(() => useActivityFeed())

    act(() => {
      result.current.setFilter({ type: 'highlights', book: 'john', color: 'joy' })
      result.current.setSort('canonical')
    })
    act(() => {
      result.current.clearFilters()
    })
    expect(result.current.filter).toEqual({ type: 'all', book: 'all', color: 'all' })
    expect(result.current.sort).toBe('recent')
  })

  it('cleans up subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useActivityFeed())

    expect(shared.highlightListeners.size).toBe(1)
    expect(shared.bookmarkListeners.size).toBe(1)
    expect(shared.noteListeners.size).toBe(1)

    unmount()

    expect(shared.highlightListeners.size).toBe(0)
    expect(shared.bookmarkListeners.size).toBe(0)
    expect(shared.noteListeners.size).toBe(0)
  })
})
