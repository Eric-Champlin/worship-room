import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BIBLE_HIGHLIGHTS_KEY, MAX_HIGHLIGHTS } from '@/constants/bible'

import { useBibleHighlights } from '../useBibleHighlights'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

describe('useBibleHighlights', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
  })

  it('returns empty highlights when no data in localStorage', () => {
    const { result } = renderHook(() => useBibleHighlights())
    expect(result.current.getAllHighlights()).toEqual([])
  })

  it('adds highlight to localStorage and reads it back', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleHighlights())

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))

    const highlights = result.current.getHighlightsForChapter('genesis', 1)
    expect(highlights).toHaveLength(1)
    expect(highlights[0].color).toBe('#FBBF24')
    expect(highlights[0].verseNumber).toBe(1)

    const stored = JSON.parse(localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)!)
    expect(stored).toHaveLength(1)
  })

  it('toggles off when same color applied to same verse', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleHighlights())

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))
    expect(result.current.getHighlightForVerse('genesis', 1, 1)).toBeDefined()

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))
    expect(result.current.getHighlightForVerse('genesis', 1, 1)).toBeUndefined()
  })

  it('switches color when different color applied to same verse', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleHighlights())

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))
    expect(result.current.getHighlightForVerse('genesis', 1, 1)?.color).toBe('#FBBF24')

    act(() => result.current.setHighlight('genesis', 1, 1, '#34D399'))
    expect(result.current.getHighlightForVerse('genesis', 1, 1)?.color).toBe('#34D399')
    expect(result.current.getAllHighlights()).toHaveLength(1)
  })

  it('prunes oldest highlights when max 500 reached', () => {
    mockAuth.isAuthenticated = true

    // Seed 500 highlights
    const highlights = Array.from({ length: MAX_HIGHLIGHTS }, (_, i) => ({
      book: 'genesis',
      chapter: Math.floor(i / 50) + 1,
      verseNumber: (i % 50) + 1,
      color: '#FBBF24',
      createdAt: new Date(2025, 0, 1, 0, 0, i).toISOString(),
    }))
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, JSON.stringify(highlights))

    const { result: r2 } = renderHook(() => useBibleHighlights())
    expect(r2.current.getAllHighlights()).toHaveLength(MAX_HIGHLIGHTS)

    // Add one more — oldest should be pruned
    act(() => r2.current.setHighlight('john', 1, 1, '#60A5FA'))

    const all = r2.current.getAllHighlights()
    expect(all).toHaveLength(MAX_HIGHLIGHTS)
    // New highlight should be present
    expect(r2.current.getHighlightForVerse('john', 1, 1)).toBeDefined()
  })

  it('no-ops when not authenticated (setHighlight)', () => {
    const { result } = renderHook(() => useBibleHighlights())

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))

    expect(result.current.getAllHighlights()).toHaveLength(0)
    expect(localStorage.getItem(BIBLE_HIGHLIGHTS_KEY)).toBeNull()
  })

  it('no-ops when not authenticated (removeHighlight)', () => {
    // Seed a highlight
    localStorage.setItem(
      BIBLE_HIGHLIGHTS_KEY,
      JSON.stringify([
        { book: 'genesis', chapter: 1, verseNumber: 1, color: '#FBBF24', createdAt: new Date().toISOString() },
      ]),
    )
    const { result } = renderHook(() => useBibleHighlights())

    act(() => result.current.removeHighlight('genesis', 1, 1))

    // Should still be there since not authenticated
    expect(result.current.getAllHighlights()).toHaveLength(1)
  })

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, 'not valid json')
    const { result } = renderHook(() => useBibleHighlights())
    expect(result.current.getAllHighlights()).toEqual([])
  })

  it('returns empty array on non-array JSON', () => {
    localStorage.setItem(BIBLE_HIGHLIGHTS_KEY, '{"foo": "bar"}')
    const { result } = renderHook(() => useBibleHighlights())
    expect(result.current.getAllHighlights()).toEqual([])
  })

  it('getHighlightsForChapter filters correctly', () => {
    mockAuth.isAuthenticated = true
    const { result } = renderHook(() => useBibleHighlights())

    act(() => {
      result.current.setHighlight('genesis', 1, 1, '#FBBF24')
      result.current.setHighlight('genesis', 1, 3, '#34D399')
      result.current.setHighlight('genesis', 2, 1, '#60A5FA')
      result.current.setHighlight('john', 3, 16, '#F472B6')
    })

    expect(result.current.getHighlightsForChapter('genesis', 1)).toHaveLength(2)
    expect(result.current.getHighlightsForChapter('genesis', 2)).toHaveLength(1)
    expect(result.current.getHighlightsForChapter('john', 3)).toHaveLength(1)
    expect(result.current.getHighlightsForChapter('exodus', 1)).toHaveLength(0)
  })

  it('persists across hook re-mounts', () => {
    mockAuth.isAuthenticated = true
    const { result, unmount } = renderHook(() => useBibleHighlights())

    act(() => result.current.setHighlight('genesis', 1, 1, '#FBBF24'))
    unmount()

    const { result: r2 } = renderHook(() => useBibleHighlights())
    expect(r2.current.getHighlightForVerse('genesis', 1, 1)?.color).toBe('#FBBF24')
  })
})
