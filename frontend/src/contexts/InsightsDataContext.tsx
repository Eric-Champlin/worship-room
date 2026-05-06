import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { MoodEntry } from '@/types/dashboard'
import { getMoodEntries } from '@/services/mood-storage'

export interface InsightsDataContextValue {
  moodEntries: MoodEntry[]
  getMonthlyEntries: (month: number, year: number) => MoodEntry[]
}

const InsightsDataContext = createContext<InsightsDataContextValue | null>(null)

export function InsightsDataProvider({ children }: { children: ReactNode }) {
  // Single read on mount; stable across re-renders
  const moodEntries = useMemo(() => getMoodEntries(), [])

  const value = useMemo<InsightsDataContextValue>(
    () => ({
      moodEntries,
      getMonthlyEntries: (month: number, year: number) =>
        moodEntries.filter((e) => {
          const d = new Date(e.date + 'T12:00:00')
          return d.getMonth() === month && d.getFullYear() === year
        }),
    }),
    [moodEntries],
  )

  return (
    <InsightsDataContext.Provider value={value}>
      {children}
    </InsightsDataContext.Provider>
  )
}

export function useInsightsData(): InsightsDataContextValue {
  const ctx = useContext(InsightsDataContext)
  if (!ctx) {
    throw new Error('useInsightsData must be used within InsightsDataProvider')
  }
  return ctx
}
