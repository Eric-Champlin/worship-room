import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useScriptureEcho } from '../useScriptureEcho'
import { getLocalDateString } from '@/utils/date'

// ── Mocks ───────────────────────────────────────────────────────────
const mockShowWhisperToast = vi.fn()
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: mockShowWhisperToast }),
}))

vi.mock('@/services/bible-annotations-storage', () => ({
  getBookDisplayName: (slug: string) => {
    const names: Record<string, string> = { genesis: 'Genesis', psalms: 'Psalms', matthew: 'Matthew' }
    return names[slug] ?? slug
  },
}))

// ── Test helpers ────────────────────────────────────────────────────
function setHighlights(highlights: Array<{ book: string; chapter: number; verseNumber: number; color: string; createdAt: string }>) {
  localStorage.setItem('wr_bible_highlights', JSON.stringify(highlights))
}

function setPrayers(prayers: Array<{ id: string; title: string; description: string; category: string; status: string; createdAt: string; updatedAt: string; answeredAt: null; answeredNote: null; lastPrayedAt: null }>) {
  localStorage.setItem('wr_prayer_list', JSON.stringify(prayers))
}

function makePrayer(title: string, description = '') {
  return {
    id: crypto.randomUUID(),
    title,
    description,
    category: 'personal',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answeredAt: null,
    answeredNote: null,
    lastPrayedAt: null,
  }
}

// ── Tests ───────────────────────────────────────────────────────────
describe('useScriptureEcho', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    localStorage.clear()
    sessionStorage.clear()
    mockIsAuthenticated.value = true
    mockShowWhisperToast.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows whisper-toast when chapter has highlight', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    expect(mockShowWhisperToast.mock.calls[0][0].message).toContain('highlighted a verse here')
  })

  it('shows whisper-toast when chapter has prayer match', () => {
    setPrayers([makePrayer('Genesis Prayer', 'Seeking wisdom from Genesis')])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    expect(mockShowWhisperToast.mock.calls[0][0].message).toContain('Genesis Prayer')
  })

  it('does not trigger when not authenticated', () => {
    mockIsAuthenticated.value = false
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger when canShowSurprise returns false', () => {
    localStorage.setItem('wr_last_surprise_date', getLocalDateString())
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger twice for same chapter', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    const { rerender } = renderHook(
      ({ bookSlug, chapter, loading }) => useScriptureEcho(bookSlug, chapter, loading),
      { initialProps: { bookSlug: 'genesis', chapter: 1, loading: false } },
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)

    // Clear the surprise date so frequency limiter doesn't block
    localStorage.removeItem('wr_last_surprise_date')

    rerender({ bookSlug: 'genesis', chapter: 1, loading: false })

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // Still only called once
    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
  })

  it('does not trigger while loading', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, true))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('highlight message includes formatted date', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    const msg = mockShowWhisperToast.mock.calls[0][0].message
    expect(msg).toContain('March 15')
  })

  it('prayer message includes prayer title', () => {
    setPrayers([makePrayer('Forgiveness', 'Seeking forgiveness in Genesis')])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    const msg = mockShowWhisperToast.mock.calls[0][0].message
    expect(msg).toContain('Forgiveness')
  })

  it('marks surprise shown after triggering', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(localStorage.getItem('wr_last_surprise_date')).toBe(getLocalDateString())
  })

  it('shows generic message when both highlight and prayer match', () => {
    setHighlights([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ])
    setPrayers([makePrayer('Genesis Journey', 'Walking through Genesis')])

    renderHook(() => useScriptureEcho('genesis', 1, false))

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    const msg = mockShowWhisperToast.mock.calls[0][0].message
    expect(msg).toContain("You've been here before")
  })
})
