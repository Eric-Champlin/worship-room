import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { getLocalDateString } from '@/utils/date'
import { useAnniversaryMoment } from '@/hooks/useAnniversaryMoment'
import { useGratitudeCallback } from '@/hooks/useGratitudeCallback'
import { MidnightVerse } from '@/components/MidnightVerse'
import {
  canShowSurprise,
  markSurpriseShown,
  hasRainbowBeenShown,
  markRainbowShown,
} from '@/services/surprise-storage'

// ── Mocks ───────────────────────────────────────────────────────────
const mockShowWhisperToast = vi.fn()
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: mockShowWhisperToast }),
}))

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

// ── Test helpers ────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function setMoodEntries(dates: string[]) {
  const entries = dates.map((date, i) => ({
    id: String(i),
    date,
    mood: 4,
    moodLabel: 'Good',
    timestamp: Date.now(),
    verseSeen: '',
  }))
  localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
}

function makeGratitudeEntries(count: number, oldestDaysAgo: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    date: daysAgo(oldestDaysAgo - i),
    items: [`Thankful item ${i}`],
    createdAt: new Date().toISOString(),
  }))
}

// ── Integration Tests ───────────────────────────────────────────────
describe('Surprise System Integration', () => {
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

  it('Anniversary takes priority over Gratitude Callback', () => {
    // Set up both conditions: 7-day anniversary AND 7+ gratitude entries
    setMoodEntries([daysAgo(7)])
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(makeGratitudeEntries(8, 10)))

    const { result } = renderHook(() => useAnniversaryMoment())

    // Anniversary should trigger (canShowSurprise passes)
    expect(result.current.show).toBe(true)

    // Simulate the anniversary being shown (marks surprise for today)
    markSurpriseShown()

    // Now gratitude callback should NOT fire because daily limit reached
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('Midnight Verse independent of daily limit', () => {
    // First trigger a regular surprise to fill daily limit
    markSurpriseShown()
    expect(canShowSurprise()).toBe(false)

    // Now try Midnight Verse at 2 AM
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))

    render(<MidnightVerse />)

    // Midnight Verse should STILL fire (independent track)
    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    expect(mockShowWhisperToast.mock.calls[0][0].message).toContain("Can't sleep?")
  })

  it('No surprises for logged-out users', () => {
    mockIsAuthenticated.value = false

    // Set up all conditions
    setMoodEntries([daysAgo(7)])
    localStorage.setItem('wr_bible_highlights', JSON.stringify([
      { book: 'genesis', chapter: 1, verseNumber: 1, color: 'yellow', createdAt: '2026-03-15T10:00:00Z' },
    ]))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(makeGratitudeEntries(8, 10)))

    // Anniversary
    const { result } = renderHook(() => useAnniversaryMoment())
    expect(result.current.show).toBe(false)

    // Gratitude Callback
    renderHook(() => useGratitudeCallback(true))

    // Midnight Verse
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)

    // Nothing should have fired
    expect(mockShowWhisperToast).not.toHaveBeenCalled()

    // No localStorage writes for surprise keys
    expect(localStorage.getItem('wr_last_surprise_date')).toBeNull()
    expect(localStorage.getItem('wr_anniversary_milestones_shown')).toBeNull()
    expect(localStorage.getItem('wr_gratitude_callback_last_shown')).toBeNull()
  })

  it('Streak Weather is a one-time event', () => {
    expect(hasRainbowBeenShown()).toBe(false)
    markRainbowShown()
    expect(hasRainbowBeenShown()).toBe(true)
    // Can never be "un-shown"
    expect(hasRainbowBeenShown()).toBe(true)
  })

  it('Streak Weather overrides daily limit', () => {
    // Fill the daily limit first
    markSurpriseShown()
    expect(canShowSurprise()).toBe(false)

    // Rainbow check does NOT use canShowSurprise — only hasRainbowBeenShown
    // This mirrors Dashboard.tsx logic which skips the frequency limiter
    expect(hasRainbowBeenShown()).toBe(false)

    // Mark rainbow shown (simulates Dashboard effect firing despite daily limit)
    markRainbowShown()
    expect(hasRainbowBeenShown()).toBe(true)
  })

  it('Reduced motion: whisper-toast content accessible without animation', () => {
    // This is verified in WhisperToast.test.tsx —
    // WhisperToast applies motion-reduce:duration-100 and omits translate-y
    // This smoke check confirms the mock-based rendering still works
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    // Content is passed regardless of motion preference
    expect(mockShowWhisperToast.mock.calls[0][0].message).toBeTruthy()
    expect(mockShowWhisperToast.mock.calls[0][0].highlightedText).toBeTruthy()
  })
})
