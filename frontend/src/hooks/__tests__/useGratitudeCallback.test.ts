import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGratitudeCallback } from '../useGratitudeCallback'
import { getLocalDateString } from '@/utils/date'

// ── Mocks ───────────────────────────────────────────────────────────
const mockShowWhisperToast = vi.fn()
const mockIsAuthenticated = vi.hoisted(() => ({ value: true }))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated.value }),
}))

vi.mock('@/components/ui/WhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: mockShowWhisperToast }),
}))

// ── Test helpers ────────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function makeGratitudeEntries(count: number, oldestDaysAgo: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    date: daysAgo(oldestDaysAgo - i),
    items: [`I'm thankful for item ${i}`],
    createdAt: new Date().toISOString(),
  }))
}

// ── Tests ───────────────────────────────────────────────────────────
describe('useGratitudeCallback', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    mockIsAuthenticated.value = true
    mockShowWhisperToast.mockClear()
  })

  it('triggers when 7+ entries and weekly cooldown passed', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).toHaveBeenCalledTimes(1)
    expect(mockShowWhisperToast.mock.calls[0][0].message).toContain('thankful')
  })

  it('does not trigger with fewer than 7 entries', () => {
    const entries = makeGratitudeEntries(5, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger when weekly cooldown active', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    localStorage.setItem('wr_gratitude_callback_last_shown', daysAgo(3))
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger when daily limit reached', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    localStorage.setItem('wr_last_surprise_date', getLocalDateString())
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger when not authenticated', () => {
    mockIsAuthenticated.value = false
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('does not trigger when not on dashboard', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(false))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('only picks entries older than 3 days', () => {
    // All entries from the last 2 days — none qualify
    const entries = makeGratitudeEntries(8, 2)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    expect(mockShowWhisperToast).not.toHaveBeenCalled()
  })

  it('toast includes user gratitude text', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    const call = mockShowWhisperToast.mock.calls[0][0]
    expect(call.highlightedText).toMatch(/I'm thankful for item/)
  })

  it('marks both callback and surprise shown', () => {
    const entries = makeGratitudeEntries(8, 10)
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(entries))
    renderHook(() => useGratitudeCallback(true))
    expect(localStorage.getItem('wr_gratitude_callback_last_shown')).toBe(getLocalDateString())
    expect(localStorage.getItem('wr_last_surprise_date')).toBe(getLocalDateString())
  })
})
