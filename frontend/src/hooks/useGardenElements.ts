import { useMemo } from 'react'

export interface GardenActivityElements {
  writingDesk: boolean // journal entries >= 10
  cushion: boolean // meditation sessions >= 10
  candle: boolean // prayer wall days >= 10
  bible: boolean // bible chapters >= 10
  windChime: boolean // listening sessions >= 10
}

const THRESHOLD = 10

function countJournalDays(): number {
  try {
    const raw = localStorage.getItem('wr_daily_activities')
    if (!raw) return 0
    const log: Record<string, { journal?: boolean }> = JSON.parse(raw)
    return Object.values(log).filter((day) => day.journal === true).length
  } catch {
    return 0
  }
}

function countPrayerWallDays(): number {
  try {
    const raw = localStorage.getItem('wr_daily_activities')
    if (!raw) return 0
    const log: Record<string, { prayerWall?: boolean }> = JSON.parse(raw)
    return Object.values(log).filter((day) => day.prayerWall === true).length
  } catch {
    return 0
  }
}

function countMeditationSessions(): number {
  try {
    const raw = localStorage.getItem('wr_meditation_history')
    if (!raw) return 0
    const sessions: unknown[] = JSON.parse(raw)
    return Array.isArray(sessions) ? sessions.length : 0
  } catch {
    return 0
  }
}

function countBibleChapters(): number {
  try {
    const raw = localStorage.getItem('wr_bible_progress')
    if (!raw) return 0
    const progress: Record<string, number[]> = JSON.parse(raw)
    return Object.values(progress).reduce(
      (sum, chapters) => sum + (Array.isArray(chapters) ? chapters.length : 0),
      0,
    )
  } catch {
    return 0
  }
}

function countListeningSessions(): number {
  try {
    const raw = localStorage.getItem('wr_listening_history')
    if (!raw) return 0
    const sessions: unknown[] = JSON.parse(raw)
    return Array.isArray(sessions) ? sessions.length : 0
  } catch {
    return 0
  }
}

export function useGardenElements(): GardenActivityElements {
  return useMemo(
    () => ({
      writingDesk: countJournalDays() >= THRESHOLD,
      cushion: countMeditationSessions() >= THRESHOLD,
      candle: countPrayerWallDays() >= THRESHOLD,
      bible: countBibleChapters() >= THRESHOLD,
      windChime: countListeningSessions() >= THRESHOLD,
    }),
    [],
  )
}
