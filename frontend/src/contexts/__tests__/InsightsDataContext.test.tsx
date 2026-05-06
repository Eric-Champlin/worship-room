import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, render, act } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { InsightsDataProvider, useInsightsData } from '../InsightsDataContext'
import { getMoodEntries } from '@/services/mood-storage'
import type { MoodEntry } from '@/types/dashboard'

vi.mock('@/services/mood-storage', () => ({
  getMoodEntries: vi.fn(),
}))

const makeMoodEntry = (overrides: Partial<MoodEntry> = {}): MoodEntry => ({
  id: 'entry-1',
  date: '2026-03-15',
  mood: 3,
  moodLabel: 'Okay',
  text: '',
  timestamp: new Date('2026-03-15T12:00:00').getTime(),
  verseSeen: 'John 3:16',
  timeOfDay: 'morning',
  ...overrides,
})

function wrapper({ children }: { children: ReactNode }) {
  return <InsightsDataProvider>{children}</InsightsDataProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMoodEntries).mockReturnValue([])
})

describe('InsightsDataContext', () => {
  it('Provider exposes moodEntries matching getMoodEntries()', () => {
    const entries: MoodEntry[] = [makeMoodEntry()]
    vi.mocked(getMoodEntries).mockReturnValue(entries)

    const { result } = renderHook(() => useInsightsData(), { wrapper })

    expect(result.current.moodEntries).toBe(entries)
  })

  it('getMonthlyEntries filters correctly for a specific month and year', () => {
    const feb2026 = makeMoodEntry({ id: '1', date: '2026-02-14' })
    const mar2026 = makeMoodEntry({ id: '2', date: '2026-03-15' })
    const apr2026 = makeMoodEntry({ id: '3', date: '2026-04-01' })
    const mar2025 = makeMoodEntry({ id: '4', date: '2025-03-10' })
    vi.mocked(getMoodEntries).mockReturnValue([feb2026, mar2026, apr2026, mar2025])

    const { result } = renderHook(() => useInsightsData(), { wrapper })

    // getMonth() returns 0-based: March = 2
    const marchEntries = result.current.getMonthlyEntries(2, 2026)
    expect(marchEntries).toHaveLength(1)
    expect(marchEntries[0].id).toBe('2')
  })

  it('getMonthlyEntries returns empty array when no matches', () => {
    const mar2026 = makeMoodEntry({ id: '1', date: '2026-03-15' })
    vi.mocked(getMoodEntries).mockReturnValue([mar2026])

    const { result } = renderHook(() => useInsightsData(), { wrapper })

    // January 2025 — no entries
    const jan2025 = result.current.getMonthlyEntries(0, 2025)
    expect(jan2025).toHaveLength(0)
    expect(jan2025).toEqual([])
  })

  it('useInsightsData throws outside provider', () => {
    const ConsumerComponent = () => {
      useInsightsData()
      return null
    }

    expect(() => render(<ConsumerComponent />)).toThrow(
      'useInsightsData must be used within InsightsDataProvider',
    )
  })

  it('moodEntries reference is stable across consumer re-renders', () => {
    const entries: MoodEntry[] = [makeMoodEntry()]
    vi.mocked(getMoodEntries).mockReturnValue(entries)

    const capturedRefs: MoodEntry[][] = []

    function Consumer() {
      const { moodEntries } = useInsightsData()
      capturedRefs.push(moodEntries)
      return null
    }

    function Wrapper() {
      const [count, setCount] = useState(0)
      return (
        <InsightsDataProvider>
          <Consumer />
          <button onClick={() => setCount((c) => c + 1)}>
            Re-render {count}
          </button>
        </InsightsDataProvider>
      )
    }

    const { getByText } = render(<Wrapper />)

    act(() => {
      getByText(/Re-render/).click()
    })

    expect(capturedRefs.length).toBeGreaterThanOrEqual(2)
    // All renders should have the exact same reference
    expect(capturedRefs[0]).toBe(capturedRefs[capturedRefs.length - 1])
  })

  it("Provider's getMoodEntries() fires once per mount after re-render", () => {
    vi.mocked(getMoodEntries).mockReturnValue([])

    function Wrapper() {
      const [count, setCount] = useState(0)
      return (
        <InsightsDataProvider>
          <button onClick={() => setCount((c) => c + 1)}>
            Re-render {count}
          </button>
        </InsightsDataProvider>
      )
    }

    const { getByText } = render(<Wrapper />)

    act(() => {
      getByText(/Re-render/).click()
    })

    // Should still be called exactly once — useMemo with [] deps
    expect(vi.mocked(getMoodEntries)).toHaveBeenCalledTimes(1)
  })
})
