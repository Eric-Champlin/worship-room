import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { useGettingStarted } from '../useGettingStarted'
import type { ActivityType } from '@/types/dashboard'

const ALL_FALSE: Record<ActivityType, boolean> = {
  mood: false,
  pray: false,
  listen: false,
  prayerWall: false,
  readingPlan: false,
  gratitude: false,
  meditate: false,
  journal: false,
  reflection: false,
}

let hookResult: ReturnType<typeof useGettingStarted>

function TestHarness({ todayActivities }: { todayActivities: Record<ActivityType, boolean> }) {
  hookResult = useGettingStarted(todayActivities)
  return (
    <div>
      <span data-testid="count">{hookResult.completedCount}</span>
      <span data-testid="all-complete">{hookResult.allComplete.toString()}</span>
      <span data-testid="visible">{hookResult.isVisible.toString()}</span>
      {hookResult.items.map((item) => (
        <span key={item.key} data-testid={`item-${item.key}`}>
          {item.completed ? 'done' : 'pending'}
        </span>
      ))}
    </div>
  )
}

function renderHook(todayActivities: Record<ActivityType, boolean> = ALL_FALSE) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <TestHarness todayActivities={todayActivities} />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  localStorage.setItem('wr_onboarding_complete', 'true')
})

describe('useGettingStarted', () => {
  it('returns 6 items', () => {
    renderHook()
    expect(hookResult.items).toHaveLength(6)
    expect(hookResult.items[0].label).toBe('Check in with your mood')
    expect(hookResult.items[5].label).toBe('Explore the Prayer Wall')
  })

  it('detects completion from todayActivities', () => {
    renderHook({ ...ALL_FALSE, mood: true })
    expect(screen.getByTestId('item-mood_done').textContent).toBe('done')
  })

  it('detects completion from permanent flags', () => {
    localStorage.setItem(
      'wr_getting_started',
      JSON.stringify({ mood_done: true, pray_done: false, journal_done: false, meditate_done: false, ambient_visited: false, prayer_wall_visited: false }),
    )
    renderHook()
    expect(screen.getByTestId('item-mood_done').textContent).toBe('done')
  })

  it('syncs todayActivities to permanent flags', () => {
    renderHook({ ...ALL_FALSE, pray: true })
    const stored = JSON.parse(localStorage.getItem('wr_getting_started') || '{}')
    expect(stored.pray_done).toBe(true)
  })

  it('isVisible false when onboarding not complete', () => {
    localStorage.removeItem('wr_onboarding_complete')
    renderHook()
    expect(screen.getByTestId('visible').textContent).toBe('false')
  })

  it('isVisible false when already complete', () => {
    localStorage.setItem('wr_getting_started_complete', 'true')
    renderHook()
    expect(screen.getByTestId('visible').textContent).toBe('false')
  })

  it('isVisible true when conditions met', () => {
    renderHook()
    expect(screen.getByTestId('visible').textContent).toBe('true')
  })

  it('allComplete true when all 6 flags true', () => {
    localStorage.setItem(
      'wr_getting_started',
      JSON.stringify({
        mood_done: true,
        pray_done: true,
        journal_done: true,
        meditate_done: true,
        ambient_visited: true,
        prayer_wall_visited: true,
      }),
    )
    renderHook({ ...ALL_FALSE, mood: true, pray: true, journal: true, meditate: true })
    expect(screen.getByTestId('all-complete').textContent).toBe('true')
  })

  it('dismiss sets wr_getting_started_complete', () => {
    renderHook()
    act(() => {
      hookResult.dismiss()
    })
    expect(localStorage.getItem('wr_getting_started_complete')).toBe('true')
  })

  it('isVisible false when not authenticated', () => {
    localStorage.removeItem('wr_auth_simulated')
    renderHook()
    expect(screen.getByTestId('visible').textContent).toBe('false')
  })
})
