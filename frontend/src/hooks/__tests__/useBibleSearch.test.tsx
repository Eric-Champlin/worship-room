import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

import { useBibleSearch } from '../useBibleSearch'

// Mock the search engine
const mockSearchBible = vi.fn().mockReturnValue({ results: [], total: 0 })
const mockLoadSearchIndex = vi.fn().mockResolvedValue({})
const mockLoadVerseTexts = vi.fn().mockResolvedValue(new Map())
const mockApplyProximityBonus = vi.fn()
const mockTokenize = vi.fn().mockReturnValue(['test'])

vi.mock('@/lib/search', () => ({
  searchBible: (...args: unknown[]) => mockSearchBible(...args),
  loadSearchIndex: (...args: unknown[]) => mockLoadSearchIndex(...args),
  loadVerseTexts: (...args: unknown[]) => mockLoadVerseTexts(...args),
  applyProximityBonus: (...args: unknown[]) => mockApplyProximityBonus(...args),
  tokenize: (...args: unknown[]) => mockTokenize(...args),
}))

describe('useBibleSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty query and no results', () => {
    const { result } = renderHook(() => useBibleSearch())
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
    expect(result.current.totalResults).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('requires minimum 2 characters', () => {
    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('a'))
    expect(result.current.results).toEqual([])
  })

  it('triggers search after debounce for valid query', async () => {
    vi.useRealTimers()
    mockSearchBible.mockReturnValue({
      results: [{
        bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16,
        text: '', score: 1, matchedTokens: ['love'],
      }],
      total: 1,
    })
    mockLoadVerseTexts.mockResolvedValue(new Map([['john:3:16', 'For God so loved...']]))

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('love'))

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    expect(result.current.results[0].bookSlug).toBe('john')
    expect(mockLoadSearchIndex).toHaveBeenCalled()
  })

  it('clears results when query is cleared', async () => {
    vi.useRealTimers()
    mockSearchBible.mockReturnValue({
      results: [{ bookSlug: 'john', bookName: 'John', chapter: 3, verse: 16, text: '', score: 1, matchedTokens: ['love'] }],
      total: 1,
    })
    mockLoadVerseTexts.mockResolvedValue(new Map([['john:3:16', 'text']]))

    const { result } = renderHook(() => useBibleSearch())

    act(() => result.current.setQuery('love'))
    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0)
    })

    act(() => result.current.setQuery(''))
    expect(result.current.results).toEqual([])
    expect(result.current.totalResults).toBe(0)
  })

  it('isLoadingIndex is true during first load', async () => {
    vi.useRealTimers()
    let resolveIndex: () => void
    mockLoadSearchIndex.mockReturnValue(new Promise<void>((r) => { resolveIndex = r }))

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('love'))

    await waitFor(() => {
      expect(result.current.isLoadingIndex).toBe(true)
    })

    act(() => resolveIndex!())
  })

  it('exposes totalResults and hasMore', async () => {
    vi.useRealTimers()
    const manyResults = Array.from({ length: 50 }, (_, i) => ({
      bookSlug: 'psalms', bookName: 'Psalms', chapter: 1, verse: i + 1,
      text: '', score: 1, matchedTokens: ['peace'],
    }))
    mockSearchBible.mockReturnValue({ results: manyResults, total: 120 })
    mockLoadVerseTexts.mockResolvedValue(new Map())

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('peace'))

    await waitFor(() => {
      expect(result.current.results.length).toBe(50)
    })
    expect(result.current.totalResults).toBe(120)
    expect(result.current.hasMore).toBe(true)
  })

  it('sets error when index load fails', async () => {
    vi.useRealTimers()
    mockLoadSearchIndex.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('love'))

    await waitFor(() => {
      expect(result.current.error).toBe('Unable to load search. Please try again.')
    })
    expect(result.current.isSearching).toBe(false)
  })
})

// BB-38 controlled mode tests
describe('useBibleSearch — controlled mode (BB-38)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns controlledQuery when the option is provided', () => {
    const { result } = renderHook(() =>
      useBibleSearch({ controlledQuery: 'love', onQueryChange: vi.fn() }),
    )
    expect(result.current.query).toBe('love')
  })

  it('setQuery calls onQueryChange instead of updating internal state', () => {
    const onQueryChange = vi.fn()
    const { result } = renderHook(() =>
      useBibleSearch({ controlledQuery: 'initial', onQueryChange }),
    )
    act(() => result.current.setQuery('peace'))
    expect(onQueryChange).toHaveBeenCalledWith('peace')
    expect(result.current.query).toBe('initial')
  })

  it('controlled query updates on prop change between renders', () => {
    const onQueryChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ q }: { q: string }) =>
        useBibleSearch({ controlledQuery: q, onQueryChange }),
      { initialProps: { q: 'love' } },
    )
    expect(result.current.query).toBe('love')
    rerender({ q: 'peace' })
    expect(result.current.query).toBe('peace')
  })

  it('switches back to uncontrolled when options are omitted on rerender', () => {
    const onQueryChange = vi.fn()
    const { result, rerender } = renderHook(
      ({ controlled }: { controlled: boolean }) =>
        useBibleSearch(
          controlled
            ? { controlledQuery: 'control-value', onQueryChange }
            : undefined,
        ),
      { initialProps: { controlled: true } },
    )
    expect(result.current.query).toBe('control-value')
    rerender({ controlled: false })
    expect(result.current.query).toBe('')
  })
})
