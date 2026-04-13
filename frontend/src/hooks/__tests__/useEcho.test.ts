import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Highlight } from '@/types/bible'

const MS_PER_DAY = 86_400_000

// --- Mock store modules ---
const mockHighlights: Highlight[] = []
const hlListeners = new Set<() => void>()

vi.mock('@/lib/bible/highlightStore', () => ({
  getAllHighlights: () => [...mockHighlights],
  subscribe: (fn: () => void) => {
    hlListeners.add(fn)
    return () => hlListeners.delete(fn)
  },
}))

const mockCards: Array<Record<string, unknown>> = []
const memListeners = new Set<() => void>()

vi.mock('@/lib/memorize', () => ({
  getAllCards: () => [...mockCards],
  subscribe: (fn: () => void) => {
    memListeners.add(fn)
    return () => memListeners.delete(fn)
  },
}))

const mockVisits: Record<string, Array<{ book: string; chapter: number }>> = {}
const visitListeners = new Set<() => void>()

vi.mock('@/lib/heatmap/chapterVisitStore', () => ({
  getAllVisits: () => ({ ...mockVisits }),
  subscribe: (fn: () => void) => {
    visitListeners.add(fn)
    return () => visitListeners.delete(fn)
  },
}))

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn().mockResolvedValue({
    bookSlug: 'john',
    chapter: 3,
    verses: [
      { number: 16, text: 'For God so loved the world' },
      { number: 17, text: 'that he gave his only Son' },
    ],
    paragraphs: [],
  }),
}))

function daysAgo(days: number): number {
  return Date.now() - days * MS_PER_DAY
}

describe('useEcho', () => {
  beforeEach(() => {
    mockHighlights.length = 0
    mockCards.length = 0
    Object.keys(mockVisits).forEach((k) => delete mockVisits[k])
    hlListeners.clear()
    memListeners.clear()
    visitListeners.clear()
  })

  it('returns null for empty stores', async () => {
    const { useEcho } = await import('../useEcho')
    const { result } = renderHook(() => useEcho())
    expect(result.current).toBeNull()
  })

  it('returns echo when highlight matches interval', async () => {
    mockHighlights.push({
      id: 'hl-1',
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      color: 'joy',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    })
    const { useEcho } = await import('../useEcho')
    const { result } = renderHook(() => useEcho())
    expect(result.current).not.toBeNull()
    expect(result.current!.kind).toBe('highlighted')
  })

  it('subscribes to all three stores', async () => {
    const { useEcho } = await import('../useEcho')
    renderHook(() => useEcho())
    expect(hlListeners.size).toBe(1)
    expect(memListeners.size).toBe(1)
    expect(visitListeners.size).toBe(1)
  })

  it('unsubscribes on unmount', async () => {
    const { useEcho } = await import('../useEcho')
    const { unmount } = renderHook(() => useEcho())
    expect(hlListeners.size).toBe(1)
    unmount()
    expect(hlListeners.size).toBe(0)
    expect(memListeners.size).toBe(0)
    expect(visitListeners.size).toBe(0)
  })

  it('async resolves verse text for highlight echo', async () => {
    mockHighlights.push({
      id: 'hl-1',
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      color: 'joy',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    })
    const { useEcho } = await import('../useEcho')
    const { result } = renderHook(() => useEcho())

    // Wait for async resolution
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current!.text).toBe('For God so loved the world')
  })

  it('memorized echo has text immediately', async () => {
    mockCards.push({
      id: 'card-1',
      book: 'psalms',
      bookName: 'Psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
      verseText: 'The LORD is my shepherd',
      reference: 'Psalms 23:1',
      createdAt: daysAgo(30),
      lastReviewedAt: null,
      reviewCount: 0,
    })
    const { useEcho } = await import('../useEcho')
    const { result } = renderHook(() => useEcho())
    expect(result.current!.text).toBe('The LORD is my shepherd')
  })

  it('markEchoSeen updates session set', async () => {
    mockHighlights.push({
      id: 'hl-1',
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      color: 'joy',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    })
    const { useEcho, markEchoSeen } = await import('../useEcho')
    const { result, rerender } = renderHook(() => useEcho())
    const echoId = result.current!.id
    const scoreBefore = result.current!.score

    act(() => {
      markEchoSeen(echoId)
      // Trigger recomputation via store listener
      hlListeners.forEach((fn) => fn())
    })

    expect(result.current!.score).toBeLessThan(scoreBefore)
  })
})

describe('useEchoes', () => {
  beforeEach(() => {
    mockHighlights.length = 0
    mockCards.length = 0
    Object.keys(mockVisits).forEach((k) => delete mockVisits[k])
    hlListeners.clear()
    memListeners.clear()
    visitListeners.clear()
  })

  it('returns array', async () => {
    mockHighlights.push({
      id: 'hl-1',
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
      color: 'joy',
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    })
    mockCards.push({
      id: 'card-1',
      book: 'psalms',
      bookName: 'Psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
      verseText: 'The LORD is my shepherd',
      reference: 'Psalms 23:1',
      createdAt: daysAgo(30),
      lastReviewedAt: null,
      reviewCount: 0,
    })
    const { useEchoes } = await import('../useEcho')
    const { result } = renderHook(() => useEchoes())
    expect(result.current.length).toBeGreaterThanOrEqual(2)
  })

  it('respects limit option', async () => {
    mockHighlights.push(
      {
        id: 'hl-1',
        book: 'john',
        chapter: 3,
        startVerse: 16,
        endVerse: 16,
        color: 'joy',
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
      },
      {
        id: 'hl-2',
        book: 'romans',
        chapter: 8,
        startVerse: 28,
        endVerse: 28,
        color: 'promise',
        createdAt: daysAgo(14),
        updatedAt: daysAgo(14),
      },
    )
    const { useEchoes } = await import('../useEcho')
    const { result } = renderHook(() => useEchoes({ limit: 1 }))
    expect(result.current).toHaveLength(1)
  })
})
