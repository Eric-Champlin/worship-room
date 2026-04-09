import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useVerseOfTheDay } from '../useVerseOfTheDay'

vi.mock('@/data/bible', () => ({
  loadChapterWeb: vi.fn(),
}))

vi.mock('@/lib/bible/votdSelector', () => ({
  selectVotdForDate: vi.fn(),
  getDayOfYear: vi.fn(),
}))

import { loadChapterWeb } from '@/data/bible'
import { selectVotdForDate, getDayOfYear } from '@/lib/bible/votdSelector'

const mockLoadChapterWeb = loadChapterWeb as ReturnType<typeof vi.fn>
const mockSelectVotdForDate = selectVotdForDate as ReturnType<typeof vi.fn>
const mockGetDayOfYear = getDayOfYear as ReturnType<typeof vi.fn>

const MOCK_ENTRY = {
  ref: 'Psalms 23:1',
  book: 'psalms',
  chapter: 23,
  startVerse: 1,
  endVerse: 1,
  theme: 'provision' as const,
}

const MOCK_CHAPTER = {
  bookSlug: 'psalms',
  chapter: 23,
  verses: [
    { number: 1, text: 'Yahweh is my shepherd; I shall lack nothing.' },
    { number: 2, text: 'He makes me lie down in green pastures.' },
  ],
  paragraphs: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectVotdForDate.mockReturnValue(MOCK_ENTRY)
  mockGetDayOfYear.mockReturnValue(99)
  mockLoadChapterWeb.mockResolvedValue(MOCK_CHAPTER)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useVerseOfTheDay', () => {
  it('returns hydrated VOTD on mount', async () => {
    const { result } = renderHook(() => useVerseOfTheDay(new Date('2026-04-09')))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.votd).not.toBeNull()
    expect(result.current.votd!.verseText).toBe('Yahweh is my shepherd; I shall lack nothing.')
    expect(result.current.votd!.bookName).toBe('Psalms')
    expect(result.current.votd!.wordCount).toBe(8)
    expect(result.current.votd!.entry).toEqual(MOCK_ENTRY)
  })

  it('isLoading starts true, becomes false', async () => {
    const { result } = renderHook(() => useVerseOfTheDay(new Date('2026-04-09')))

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('falls back to John 3:16 on missing chapter', async () => {
    mockLoadChapterWeb.mockResolvedValue(null)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useVerseOfTheDay(new Date('2026-04-09')))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.votd!.entry.ref).toBe('John 3:16')
    expect(result.current.votd!.verseText).toContain('For God so loved the world')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('falls back to John 3:16 on missing verse range', async () => {
    // Chapter exists but verses don't match
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'psalms',
      chapter: 23,
      verses: [{ number: 99, text: 'Different verse' }],
      paragraphs: [],
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useVerseOfTheDay(new Date('2026-04-09')))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.votd!.entry.ref).toBe('John 3:16')
    consoleSpy.mockRestore()
  })

  it('wordCount correctly computed', async () => {
    mockLoadChapterWeb.mockResolvedValue({
      ...MOCK_CHAPTER,
      verses: [
        { number: 1, text: 'One two three four five six seven.' },
      ],
    })

    const { result } = renderHook(() => useVerseOfTheDay(new Date('2026-04-09')))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.votd!.wordCount).toBe(7)
  })

  it('midnight poll detects date change via useTimeTick', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Initial day = 99
    mockGetDayOfYear.mockReturnValue(99)

    const { result } = renderHook(() => useVerseOfTheDay())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate midnight: day changes to 100
    const newEntry = {
      ...MOCK_ENTRY,
      ref: 'John 3:16',
      book: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 16,
    }
    mockSelectVotdForDate.mockReturnValue(newEntry)
    mockGetDayOfYear.mockReturnValue(100)
    mockLoadChapterWeb.mockResolvedValue({
      bookSlug: 'john',
      chapter: 3,
      verses: [{ number: 16, text: 'For God so loved the world.' }],
      paragraphs: [],
    })

    // Advance past useTimeTick interval (60s) — triggers currentMinute change
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
    })

    await waitFor(() => {
      expect(result.current.votd!.entry.ref).toBe('John 3:16')
    })

    vi.useRealTimers()
  })

  it('no polling when date prop provided', async () => {
    // Use a stable date reference to avoid re-render loop from new Date() per render
    const fixedDate = new Date('2026-04-09')
    const { result } = renderHook(() => useVerseOfTheDay(fixedDate))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // selectVotdForDate should only have been called once (initial mount load)
    // The midnight-poll useEffect skips entirely when `date` is provided
    expect(mockSelectVotdForDate).toHaveBeenCalledTimes(1)
  })

  it('console error logged on missing verse', async () => {
    mockLoadChapterWeb.mockResolvedValue(null)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() => useVerseOfTheDay(new Date(2026, 3, 9)))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })
})
