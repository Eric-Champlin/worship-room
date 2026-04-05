import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MidnightVerse } from '../MidnightVerse'

// ── Mocks ───────────────────────────────────────────────────────────
const mockShowWhisperToast = vi.fn()
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: mockShowWhisperToast }),
}))

// ── Tests ───────────────────────────────────────────────────────────
describe('MidnightVerse', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    mockIsAuthenticated.value = true
    mockShowWhisperToast.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows toast between midnight and 3:59 AM', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0)) // 2:00 AM
    render(<MidnightVerse />)
    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    expect(mockShowWhisperToast.mock.calls[0][0].message).toContain("Can't sleep?")
  })

  it('does not show outside midnight hours', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 8, 0, 0)) // 8:00 AM
    render(<MidnightVerse />)
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not show when not authenticated', () => {
    mockIsAuthenticated.value = false
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not show when already shown this session', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    sessionStorage.setItem('wr_midnight_verse_shown', 'true')
    render(<MidnightVerse />)
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('selects correct verse by day of month', () => {
    // Day 1 → index 1 (1 % 4 = 1) → Psalm 94:18
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    const text = mockShowWhisperToast.mock.calls[0][0].highlightedText
    expect(text).toContain('Psalm 94:18')
  })

  it('toast includes CTA link to sleep sounds', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    expect(mockShowWhisperToast.mock.calls[0][0].ctaTo).toBe('/music?tab=sleep')
    expect(mockShowWhisperToast.mock.calls[0][0].ctaLabel).toBe('Listen to sleep sounds')
  })

  it('toast duration is 10 seconds', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    expect(mockShowWhisperToast.mock.calls[0][0].duration).toBe(10000)
  })

  it('uses whisper sound', () => {
    vi.setSystemTime(new Date(2026, 3, 1, 2, 0, 0))
    render(<MidnightVerse />)
    expect(mockShowWhisperToast.mock.calls[0][0].soundId).toBe('whisper')
  })
})
