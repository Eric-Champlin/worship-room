import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

import { useBibleSearch } from '../useBibleSearch'
import type { BibleChapter } from '@/types/bible'

const mockChapters: BibleChapter[] = [
  {
    bookSlug: 'john',
    chapter: 3,
    verses: [
      { number: 15, text: 'that whoever believes in him should not perish, but have eternal life.' },
      { number: 16, text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.' },
      { number: 17, text: 'For God didn\'t send his Son into the world to judge the world, but that the world should be saved through him.' },
    ],
  },
]

vi.mock('@/data/bible', () => ({
  loadAllBookText: vi.fn().mockImplementation((slug: string) => {
    if (slug === 'john') return Promise.resolve(mockChapters)
    return Promise.resolve([])
  }),
  getBookBySlug: vi.fn(),
  getBooksByTestament: vi.fn(),
  getBooksByCategory: vi.fn(),
  getBibleGatewayUrl: vi.fn(),
}))

describe('useBibleSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useBibleSearch())
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
  })

  it('requires minimum 2 characters', () => {
    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('a'))
    expect(result.current.results).toEqual([])
  })

  it('finds matching verses after debounce', async () => {
    vi.useRealTimers()
    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('loved the world'))

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    expect(result.current.results[0].verseNumber).toBe(16)
    expect(result.current.results[0].bookSlug).toBe('john')
    expect(result.current.results[0].chapter).toBe(3)
  })

  it('search is case-insensitive', async () => {
    vi.useRealTimers()
    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('FOR GOD SO LOVED'))

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })
  })

  it('includes context verses before and after match', async () => {
    vi.useRealTimers()
    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('loved the world'))

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    const r = result.current.results[0]
    expect(r.contextBefore).toBeDefined()
    expect(r.contextAfter).toBeDefined()
  })

  it('special regex characters in query do not crash', async () => {
    vi.useRealTimers()
    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('test[.*+'))

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false)
    })

    // Should not throw, just return no results
    expect(result.current.results).toEqual([])
  })

  it('clears results when query is cleared', async () => {
    vi.useRealTimers()
    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('loved the world'))

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    act(() => result.current.setQuery(''))
    expect(result.current.results).toEqual([])
  })
})
