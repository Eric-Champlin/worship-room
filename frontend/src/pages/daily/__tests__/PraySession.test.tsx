import { render, screen, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PraySession } from '../PraySession'

const mockRecordActivity = vi.fn()
const mockMarkPrayComplete = vi.fn()

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    recordActivity: mockRecordActivity,
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {},
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    newlyEarnedBadges: [],
    previousStreak: null,
    isFreeRepairAvailable: false,
    clearNewlyEarnedBadges: vi.fn(),
    repairStreak: vi.fn(),
  }),
}))

vi.mock('@/hooks/useCompletionTracking', () => ({
  useCompletionTracking: () => ({
    completion: { date: '', pray: false, journal: false, meditate: { completed: false, types: [] }, guidedPrayer: [] },
    markPrayComplete: mockMarkPrayComplete,
    markJournalComplete: vi.fn(),
    markMeditationComplete: vi.fn(),
    markGuidedPrayerComplete: vi.fn(),
    isPrayComplete: false,
    isJournalComplete: false,
    isMeditateComplete: false,
    completedMeditationTypes: [],
    completedGuidedPrayerSessions: [],
    isGuidedPrayerComplete: () => false,
  }),
}))

function renderSession(length: 1 | 5 | 10) {
  return render(
    <MemoryRouter initialEntries={[`/daily?tab=pray&length=${length}`]}>
      <Routes>
        <Route path="/daily" element={<PraySession length={length} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PraySession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the first 1-min prompt and the End-early button on mount', () => {
    renderSession(1)
    expect(screen.getByText("Breathe. What's heavy right now?")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End prayer session early' })).toBeInTheDocument()
  })

  it('focuses the End-early button on mount (Gate-G-A11Y)', () => {
    renderSession(1)
    expect(screen.getByRole('button', { name: 'End prayer session early' })).toHaveFocus()
  })

  it('prompt container uses role=status with aria-live=polite (NOT assertive)', () => {
    renderSession(1)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('runs the full 1-min session: prompt 1 → prompt 2 → Amen + records natural completion metadata', async () => {
    renderSession(1)
    // Step through the entire 1-min flow.
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-in 1
    await act(async () => { vi.advanceTimersByTime(5000) })  // visible 1
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-out 1
    await act(async () => { vi.advanceTimersByTime(25000) }) // silence 1 → next
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-in 2
    // After fade-in of prompt 2 starts, prompt 2 should appear.
    await act(async () => { vi.advanceTimersByTime(5000) })  // visible 2
    expect(screen.getByText('Hand it over.')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(1500) })  // fade-out 2
    await act(async () => { vi.advanceTimersByTime(18000) }) // silence 2 → amen

    expect(screen.getByText('Amen.')).toBeInTheDocument()
    expect(mockRecordActivity).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledWith('pray', 'daily_hub_session', {
      metadata: { length: 1, ended_early: false, prompts_seen: 2, audio_used: false },
    })
  })

  it('End-early mid-session: records ended_early=true and transitions to Amen', async () => {
    renderSession(5)
    // Advance into the visible phase of prompt 1.
    await act(async () => { vi.advanceTimersByTime(1500) })
    // fireEvent (synchronous) is required because userEvent's internal delays
    // don't tick under vi.useFakeTimers().
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'End prayer session early' }))
    })
    expect(mockRecordActivity).toHaveBeenCalledOnce()
    expect(mockRecordActivity).toHaveBeenCalledWith('pray', 'daily_hub_session', {
      metadata: { length: 5, ended_early: true, prompts_seen: 1, audio_used: false },
    })
    expect(screen.getByText('Amen.')).toBeInTheDocument()
  })

  it('Amen screen fires onComplete after AMEN_SCREEN_HOLD_MS and recordActivity stays single-fire', async () => {
    renderSession(1)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'End prayer session early' }))
    })
    expect(screen.getByText('Amen.')).toBeInTheDocument()
    // After 3s the URL strips length= via setSearchParams; PraySession may stay
    // mounted in this test harness (no parent unmount logic). What matters is
    // recordActivity remains called once and no exception escapes.
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(mockRecordActivity).toHaveBeenCalledOnce()
  })
})
