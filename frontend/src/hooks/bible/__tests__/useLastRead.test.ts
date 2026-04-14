import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useLastRead } from '../useLastRead'

vi.mock('@/lib/bible/landingState', () => ({
  getLastRead: vi.fn(),
}))

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn(),
  getAdjacentChapter: vi.fn(),
}))

vi.mock('@/lib/bible/timeFormat', () => ({
  formatRelativeReadTime: vi.fn(),
}))

import { getLastRead } from '@/lib/bible/landingState'
import { loadChapterWeb, getAdjacentChapter } from '@/data/bible'
import { formatRelativeReadTime } from '@/lib/bible/timeFormat'

const mockGetLastRead = getLastRead as ReturnType<typeof vi.fn>
const mockLoadChapterWeb = loadChapterWeb as ReturnType<typeof vi.fn>
const mockGetAdjacentChapter = getAdjacentChapter as ReturnType<typeof vi.fn>
const mockFormatRelativeReadTime = formatRelativeReadTime as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockLoadChapterWeb.mockResolvedValue(null)
  mockGetAdjacentChapter.mockReturnValue(null)
  mockFormatRelativeReadTime.mockReturnValue('Just now')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useLastRead', () => {
  it('returns isFirstTimeReader when no localStorage', () => {
    mockGetLastRead.mockReturnValue(null)
    const { result } = renderHook(() => useLastRead())

    expect(result.current.isFirstTimeReader).toBe(true)
    expect(result.current.isActiveReader).toBe(false)
    expect(result.current.isLapsedReader).toBe(false)
  })

  it('returns isFirstTimeReader for malformed data', () => {
    // getLastRead returns null for malformed data
    mockGetLastRead.mockReturnValue(null)
    const { result } = renderHook(() => useLastRead())

    expect(result.current.isFirstTimeReader).toBe(true)
  })

  it('returns isFirstTimeReader for missing fields', () => {
    // getLastRead validates required fields and returns null
    mockGetLastRead.mockReturnValue(null)
    const { result } = renderHook(() => useLastRead())

    expect(result.current.isFirstTimeReader).toBe(true)
  })

  it('returns isActiveReader within 24h', () => {
    const oneHourAgo = Date.now() - 3_600_000
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: oneHourAgo,
    })
    mockFormatRelativeReadTime.mockReturnValue('1 hours ago')

    const { result } = renderHook(() => useLastRead())

    expect(result.current.isActiveReader).toBe(true)
    expect(result.current.isLapsedReader).toBe(false)
    expect(result.current.isFirstTimeReader).toBe(false)
    expect(result.current.book).toBe('John')
    expect(result.current.chapter).toBe(3)
  })

  it('returns isLapsedReader after 24h', () => {
    const twentyFiveHoursAgo = Date.now() - 90_000_000
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: twentyFiveHoursAgo,
    })
    mockFormatRelativeReadTime.mockReturnValue('Yesterday')

    const { result } = renderHook(() => useLastRead())

    expect(result.current.isLapsedReader).toBe(true)
    expect(result.current.isActiveReader).toBe(false)
    expect(result.current.isFirstTimeReader).toBe(false)
  })

  it('transitions from active to lapsed on tick', () => {
    vi.useFakeTimers()

    // Start at 23h 58m ago (just under 24h)
    const nearThreshold = Date.now() - (24 * 3_600_000 - 2 * 60_000)
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: nearThreshold,
    })
    mockFormatRelativeReadTime.mockReturnValue('Earlier today')

    const { result } = renderHook(() => useLastRead())
    expect(result.current.isActiveReader).toBe(true)

    // Advance 3 minutes — crosses the 24h boundary
    act(() => {
      vi.advanceTimersByTime(3 * 60_000)
    })

    expect(result.current.isLapsedReader).toBe(true)
    expect(result.current.isActiveReader).toBe(false)

    vi.useRealTimers()
  })

  it('computes relativeTime correctly', () => {
    const oneHourAgo = Date.now() - 3_600_000
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: oneHourAgo,
    })
    mockFormatRelativeReadTime.mockReturnValue('1 hours ago')

    const { result } = renderHook(() => useLastRead())

    expect(result.current.relativeTime).toBe('1 hours ago')
    expect(mockFormatRelativeReadTime).toHaveBeenCalledWith(oneHourAgo, expect.any(Number))
  })

  it('loads first line of chapter', async () => {
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: Date.now(),
    })
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [
        { number: 1, text: 'Now there was a man of the Pharisees named Nicodemus.' },
      ],
      paragraphs: [],
    })

    const { result } = renderHook(() => useLastRead())

    await waitFor(() => {
      expect(result.current.firstLineOfChapter).toBe(
        'Now there was a man of the Pharisees named Nicodemus.',
      )
    })
  })

  it('truncates first line at ~80 chars with ellipsis', async () => {
    const longText =
      'In the beginning was the Word, and the Word was with God, and the Word was God. The same was in the beginning with God.'
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 1,
      verse: 1,
      timestamp: Date.now(),
    })
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 1,
      verses: [{ number: 1, text: longText }],
      paragraphs: [],
    })

    const { result } = renderHook(() => useLastRead())

    await waitFor(() => {
      expect(result.current.firstLineOfChapter).not.toBeNull()
    })

    expect(result.current.firstLineOfChapter!.length).toBeLessThanOrEqual(81) // 80 chars + ellipsis
    expect(result.current.firstLineOfChapter).toContain('…')
  })

  it('computes nextChapter when available', () => {
    mockGetLastRead.mockReturnValue({
      book: 'John',
      chapter: 3,
      verse: 16,
      timestamp: Date.now(),
    })
    mockGetAdjacentChapter.mockReturnValue({
      bookSlug: 'john',
      bookName: 'John',
      chapter: 4,
    })

    const { result } = renderHook(() => useLastRead())

    expect(result.current.nextChapter).toEqual({
      bookSlug: 'john',
      bookName: 'John',
      chapter: 4,
    })
  })

  it('nextChapter is null for last chapter of book', () => {
    mockGetLastRead.mockReturnValue({
      book: 'Revelation',
      chapter: 22,
      verse: 1,
      timestamp: Date.now(),
    })
    mockGetAdjacentChapter.mockReturnValue(null)

    const { result } = renderHook(() => useLastRead())

    expect(result.current.nextChapter).toBeNull()
  })

  it('re-reads localStorage on tick', () => {
    vi.useFakeTimers()

    // Start with no data
    mockGetLastRead.mockReturnValue(null)
    const { result } = renderHook(() => useLastRead())
    expect(result.current.isFirstTimeReader).toBe(true)

    // Simulate the user reading a chapter — localStorage updated
    mockGetLastRead.mockReturnValue({
      book: 'Genesis',
      chapter: 1,
      verse: 1,
      timestamp: Date.now(),
    })
    mockFormatRelativeReadTime.mockReturnValue('Just now')

    // Advance timer to trigger useTimeTick → re-derive state
    act(() => {
      vi.advanceTimersByTime(61_000)
    })

    expect(result.current.isFirstTimeReader).toBe(false)
    expect(result.current.isActiveReader).toBe(true)
    expect(result.current.book).toBe('Genesis')

    vi.useRealTimers()
  })
})
